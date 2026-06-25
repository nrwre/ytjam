# Run this ONCE in an elevated ("Run as Administrator") PowerShell window.
# Registers a Scheduled Task that checks backend/tunnel health every 5
# minutes and self-heals if needed -- plus an immediate check on logon.
#
# Why a timer instead of sleep/wake events: this laptop's Modern Standby
# (S0) sleep mode doesn't reliably fire the Power-Troubleshooter wake event
# Task Scheduler listens for, so a previous version of this task silently
# never ran after sleep. A repeating timer doesn't depend on detecting any
# particular OS event -- it just checks "is this actually working" on a
# schedule, so it self-heals no matter how the PC went to sleep or woke up.

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File "E:\projects\youtube jam\scripts\start-ytjam.ps1"'

$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerLogon.Delay = "PT15S"

$triggerTimer = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -Hidden

Register-ScheduledTask -TaskName "YTJamAutoStart" -Action $action -Trigger @($triggerLogon, $triggerTimer) -Settings $settings -RunLevel Highest -Force

Write-Host "Registered. Verifying..."
Get-ScheduledTask -TaskName "YTJamAutoStart" | Select-Object TaskName, State
