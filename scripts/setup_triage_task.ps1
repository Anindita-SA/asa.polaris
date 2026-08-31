$ErrorActionPreference = "Stop"

Write-Host "Configuring Ollama Environment Variables..." -ForegroundColor Cyan
[System.Environment]::SetEnvironmentVariable('OLLAMA_MAX_LOADED_MODELS', '1', 'User')
[System.Environment]::SetEnvironmentVariable('OLLAMA_KEEP_ALIVE', '30s', 'User')
Write-Host "Set OLLAMA_MAX_LOADED_MODELS=1 and OLLAMA_KEEP_ALIVE=30s for the current user."

$TaskName = "PolarisTaskTriage"
$WorkingDir = (Get-Item .).FullName
$PowershellExe = (Get-Command powershell).Source

Write-Host "Creating Scheduled Task: $TaskName" -ForegroundColor Cyan

$TaskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
    <SessionStateChangeTrigger>
      <Enabled>true</Enabled>
      <StateChange>SessionUnlock</StateChange>
    </SessionStateChangeTrigger>
  </Triggers>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <StartWhenAvailable>true</StartWhenAvailable>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$PowershellExe</Command>
      <Arguments>-WindowStyle Hidden -ExecutionPolicy Bypass -File "scripts\run_triage_wrapper.ps1"</Arguments>
      <WorkingDirectory>$WorkingDir</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

Register-ScheduledTask -Xml $TaskXml -TaskName $TaskName -Force
Write-Host "Scheduled task successfully updated! It will trigger on your FIRST unlock/logon of the day." -ForegroundColor Green
