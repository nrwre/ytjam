# Auto-starts the YT Jam backend + Cloudflare Tunnel and republishes the
# tunnel URL to GitHub so the GitHub Pages frontend keeps pointing at it.
# Registered as a Scheduled Task to run on logon / wake from sleep.

$ErrorActionPreference = "Stop"
$repoRoot = "E:\projects\youtube jam"
$logFile = Join-Path $repoRoot "scripts\start-ytjam.log"
$ghExe = "C:\Program Files\GitHub CLI\gh.exe"
$cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$nodeExe = "node"
$repo = "nrwre/ytjam"

function Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $logFile -Value $line
}

Log "=== start-ytjam run beginning ==="

# 1. Start the Node backend if it's not already listening on 3001
$serverRunning = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $serverRunning) {
    Log "Starting Node server..."
    Start-Process -FilePath $nodeExe -ArgumentList "index.js" `
        -WorkingDirectory (Join-Path $repoRoot "server") `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $repoRoot "scripts\server.log") `
        -RedirectStandardError (Join-Path $repoRoot "scripts\server.err.log")
    Start-Sleep -Seconds 3
} else {
    Log "Node server already running."
}

# 2. Kill any existing cloudflared process (its URL is stale) and start a fresh tunnel
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$tunnelLog = Join-Path $repoRoot "scripts\cloudflared.log"
Remove-Item $tunnelLog -ErrorAction SilentlyContinue

Log "Starting Cloudflare Tunnel..."
$tunnelErrLog = Join-Path $repoRoot "scripts\cloudflared.err.log"
Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel --url http://localhost:3001" `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError $tunnelErrLog

# 3. Poll the tunnel log for the assigned URL (up to 30s)
$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    foreach ($f in @($tunnelLog, $tunnelErrLog)) {
        if (Test-Path $f) {
            $match = Select-String -Path $f -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) {
                $tunnelUrl = $match.Matches[0].Value
                break
            }
        }
    }
    if ($tunnelUrl) { break }
}

if (-not $tunnelUrl) {
    Log "ERROR: could not detect tunnel URL after 30s."
    exit 1
}

Log "Tunnel URL: $tunnelUrl"

# 4. Push the new URL to GitHub and trigger a frontend redeploy
& $ghExe variable set VITE_SERVER_URL --body $tunnelUrl -R $repo 2>&1 | ForEach-Object { Log $_ }
& $ghExe workflow run ci-cd.yml -R $repo 2>&1 | ForEach-Object { Log $_ }

Log "=== start-ytjam run complete ==="
