$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 0. Check if already ran today
$DateFile = "$ScriptDir\.last_run_date"
$Today = (Get-Date).ToString("yyyy-MM-dd")
if (Test-Path $DateFile) {
    $LastRun = Get-Content $DateFile
    if ($LastRun -eq $Today) {
        Write-Host "Triage already ran today ($Today). Skipping."
        exit
    }
}

Write-Host "First run of the day! Proceeding with triage..."
Set-Content -Path $DateFile -Value $Today

$OllamaProcessName = "ollama"
$OllamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

# 1. Check if Ollama is running
$OllamaRunning = Get-Process -Name $OllamaProcessName -ErrorAction SilentlyContinue
$StartedByUs = $false

if (-not $OllamaRunning) {
    Write-Host "Ollama is not running. Starting headless server..."
    Start-Process "$OllamaPath" -ArgumentList "serve" -WindowStyle Hidden
    $StartedByUs = $true
    Write-Host "Waiting 5 seconds for Ollama API to boot..."
    Start-Sleep -Seconds 5
} else {
    Write-Host "Ollama is already running. We will leave it open after execution."
}

# 3. Run the actual triage script
Write-Host "Executing Node triage script..."
node "$ScriptDir\task_triage.js"

# 3. Cleanup if we started it
if ($StartedByUs) {
    Write-Host "Cleaning up: Shutting down the headless Ollama server."
    Stop-Process -Name $OllamaProcessName -Force -ErrorAction SilentlyContinue
}
Write-Host "Done."
