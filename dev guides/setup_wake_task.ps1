# Run this script in PowerShell to create a scheduled task that opens Polaris when you wake your laptop.

$taskName = "OpenPolarisOnWake"
$description = "Launches Polaris automatically when waking from hibernation or unlocking the PC."

# Trigger on Workstation Unlock (Event ID 4800 in Security, but simpler is StateChange=8)
$trigger = New-ScheduledTaskTrigger -AtLogOn
# Note: To properly trigger on Unlock via PowerShell, we must use a CIM instance or XML.
# Let's use the XML method for precision.

# Replace this with your actual Polaris PWA shortcut path or URL (e.g. "http://localhost:5173")
$actionPath = "http://localhost:5173"

$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>$description</Description>
  </RegistrationInfo>
  <Triggers>
    <SessionStateChangeTrigger>
      <Enabled>true</Enabled>
      <StateChange>SessionUnlock</StateChange>
    </SessionStateChangeTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT72H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>cmd.exe</Command>
      <Arguments>/c start "" "$actionPath"</Arguments>
    </Exec>
  </Actions>
</Task>
"@

$xmlPath = "$env:TEMP\PolarisTask.xml"
$xml | Out-File -FilePath $xmlPath -Encoding Unicode

# Register the task
Register-ScheduledTask -Xml (Get-Content $xmlPath | Out-String) -TaskName $taskName -Force
Remove-Item $xmlPath

Write-Host "Task '$taskName' has been created!" -ForegroundColor Green
Write-Host "It will open $actionPath every time you unlock or wake your laptop." -ForegroundColor Yellow
Write-Host "If you installed Polaris as a Chrome/Edge PWA, you can replace the URL in the script with the path to your .lnk shortcut file and run it again."
