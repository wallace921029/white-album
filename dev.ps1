$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-ListeningPids {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
}

function Assert-PortAvailable {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [string]$ServiceName
  )

  $pids = Get-ListeningPids -Port $Port

  if ($pids.Count -gt 0) {
    throw "$ServiceName cannot start because port $Port is already in use by PID(s): $($pids -join ', ')"
  }
}

function Stop-ListeningProcesses {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [string]$ServiceName
  )

  $pids = Get-ListeningPids -Port $Port

  if ($pids.Count -eq 0) {
    return
  }

  Write-Host "$ServiceName is already running on port $Port. Stopping PID(s): $($pids -join ', ')"

  foreach ($processId in $pids) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }

  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-Date) -lt $deadline) {
    if ((Get-ListeningPids -Port $Port).Count -eq 0) {
      return
    }

    Start-Sleep -Milliseconds 200
  }
}

function Write-JobOutput {
  param(
    [Parameter(Mandatory = $true)]
    [System.Management.Automation.Job]$Job
  )

  $messages = Receive-Job -Job $Job -ErrorAction SilentlyContinue

  foreach ($message in $messages) {
    Write-Host $message
  }
}

Stop-ListeningProcesses -Port 5173 -ServiceName 'Front-end dev server'
Stop-ListeningProcesses -Port 3000 -ServiceName 'Back-end dev server'

Assert-PortAvailable -Port 5173 -ServiceName 'Front-end dev server'
Assert-PortAvailable -Port 3000 -ServiceName 'Back-end dev server'

$frontend = Start-Job -Name 'white-album-frontend' -ScriptBlock {
  param($workingDirectory)

  Set-Location $workingDirectory

  npm run dev 2>&1
} -ArgumentList $root

$backend = Start-Job -Name 'white-album-backend' -ScriptBlock {
  param($workingDirectory)

  Set-Location $workingDirectory

  npm run dev 2>&1
} -ArgumentList (Join-Path $root 'backend')

Write-Host "front-end job: $($frontend.Id)"
Write-Host "backend job: $($backend.Id)"
Write-Host 'Press Ctrl+C to stop both services.'

try {
  while ($true) {
    Write-JobOutput -Job $frontend
    Write-JobOutput -Job $backend

    if ($frontend.State -ne 'Running' -or $backend.State -ne 'Running') {
      break
    }

    Wait-Job -Job $frontend, $backend -Any -Timeout 1 | Out-Null
  }
}
finally {
  if ($frontend.State -eq 'Running') {
    Stop-Job -Job $frontend
  }

  if ($backend.State -eq 'Running') {
    Stop-Job -Job $backend
  }

  Write-JobOutput -Job $frontend
  Write-JobOutput -Job $backend

  Remove-Job -Job $frontend, $backend -Force -ErrorAction SilentlyContinue
}

if ($frontend.State -ne 'Running' -and $frontend.State -ne 'Completed') {
  throw "Front-end dev server stopped unexpectedly with state: $($frontend.State)"
}

if ($backend.State -ne 'Running' -and $backend.State -ne 'Completed') {
  throw "Back-end dev server stopped unexpectedly with state: $($backend.State)"
}

if ($frontend.State -eq 'Completed' -or $backend.State -eq 'Completed') {
  throw 'A dev server exited unexpectedly.'
}
