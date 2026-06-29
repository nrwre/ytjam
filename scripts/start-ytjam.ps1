# Self-healing check for the YT Jam backend + Cloudflare Tunnel.
# Designed to run on a short repeating timer (see register-task.ps1), NOT to
# rely on detecting sleep/wake events -- those are unreliable on Modern
# Standby (S0) laptops. Instead this just checks "is everything actually
# healthy right now" every few minutes and only takes action if something's
# broken, so it's safe to run constantly without spamming GitHub.

$ErrorActionPreference = "Stop"
$repoRoot = "E:\projects\youtube jam"
$logFile = Join-Path $repoRoot "scripts\start-ytjam.log"
$urlStateFile = Join-Path $repoRoot "scripts\current-tunnel-url.txt"
$ghExe = "C:\Program Files\GitHub CLI\gh.exe"
$cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$nodeExe = "node"
$repo = "nrwre/ytjam"

function Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $logFile -Value $line
}

function Test-Health($url) {
    try {
        $resp = Invoke-WebRequest -Uri "$url/api/health" -TimeoutSec 5 -UseBasicParsing
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

# 1. Make sure the Node backend is actually up
$serverRunning = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $serverRunning) {
    Log "Node server down, starting it..."
    Start-Process -FilePath $nodeExe -ArgumentList "index.js" `
        -WorkingDirectory (Join-Path $repoRoot "server") `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $repoRoot "scripts\server.log") `
        -RedirectStandardError (Join-Path $repoRoot "scripts\server.err.log")
    Start-Sleep -Seconds 3
}

# 2. Check whether the currently-known tunnel URL is still actually working
$currentUrl = if (Test-Path $urlStateFile) { (Get-Content $urlStateFile -Raw).Trim() } else { $null }
$tunnelHealthy = $currentUrl -and (Test-Health $currentUrl)

if ($tunnelHealthy) {
    # everything's fine, nothing to do -- this is the common case on every run
    exit 0
}

Log "Tunnel unhealthy or missing (was: $currentUrl). Restarting it..."

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$tunnelLog = Join-Path $repoRoot "scripts\cloudflared.log"
$tunnelErrLog = Join-Path $repoRoot "scripts\cloudflared.err.log"
Remove-Item $tunnelLog, $tunnelErrLog -ErrorAction SilentlyContinue

# --protocol http2 avoids cloudflared's default QUIC (UDP), which this
# network repeatedly fails to establish ("no recent network activity" /
# "handshake did not complete") even though normal HTTPS works fine --
# a common symptom of networks that throttle or block UDP.
Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel --protocol http2 --url http://localhost:3001" `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError $tunnelErrLog

$newUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    foreach ($f in @($tunnelLog, $tunnelErrLog)) {
        if (Test-Path $f) {
            $match = Select-String -Path $f -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) {
                $newUrl = $match.Matches[0].Value
                break
            }
        }
    }
    if ($newUrl) { break }
}

if (-not $newUrl) {
    Log "ERROR: could not detect new tunnel URL after 30s."
    exit 1
}

Log "New tunnel URL: $newUrl"
Set-Content -Path $urlStateFile -Value $newUrl

& $ghExe variable set VITE_SERVER_URL --body $newUrl -R $repo 2>&1 | ForEach-Object { Log $_ }
& $ghExe workflow run ci-cd.yml -R $repo 2>&1 | ForEach-Object { Log $_ }

Log "Recovery complete."
