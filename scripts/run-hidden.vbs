' Launches start-ytjam.ps1 with truly no visible window.
' Unlike -WindowStyle Hidden on powershell.exe (which still flashes briefly
' before hiding), WScript.Shell.Run with windowStyle 0 never creates a
' visible console window at all.
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -ExecutionPolicy Bypass -File ""E:\projects\youtube jam\scripts\start-ytjam.ps1""", 0, True
