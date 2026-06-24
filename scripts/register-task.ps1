# Run this ONCE in an elevated ("Run as Administrator") PowerShell window.
# Registers a Scheduled Task that auto-starts the YT Jam backend + Cloudflare
# Tunnel on logon and on wake-from-sleep, with no manual intervention needed.

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File "E:\projects\youtube jam\scripts\start-ytjam.ps1"'

$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerLogon.Delay = "PT15S"

$class = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler
$triggerWake = New-CimInstance -CimClass $class -ClientOnly
$triggerWake.Subscription = '<QueryList><Query Id="0" Path="System"><Select Path="System">*[System[Provider[@Name=''Microsoft-Windows-Power-Troubleshooter''] and EventID=1]]</Select></Query></QueryList>'
$triggerWake.Enabled = $true

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName "YTJamAutoStart" -Action $action -Trigger @($triggerLogon, $triggerWake) -Settings $settings -RunLevel Highest -Force

Write-Host "Registered. Verifying..."
Get-ScheduledTask -TaskName "YTJamAutoStart" | Select-Object TaskName, State
