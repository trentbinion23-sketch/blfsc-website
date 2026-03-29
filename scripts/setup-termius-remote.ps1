$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  Write-Host "Requesting administrator access..." -ForegroundColor Yellow
  $scriptPath = $MyInvocation.MyCommand.Path
  $escapedPath = '"' + $scriptPath + '"'
  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File $escapedPath"
  exit
}

Write-Step "Checking OpenSSH Server"
$sshCapability = Get-WindowsCapability -Online |
  Where-Object { $_.Name -like "OpenSSH.Server*" } |
  Select-Object -First 1

if (-not $sshCapability) {
  throw "OpenSSH.Server capability was not found on this PC."
}

if ($sshCapability.State -ne "Installed") {
  Add-WindowsCapability -Online -Name $sshCapability.Name | Out-Null
}

Write-Step "Starting SSH services"
Set-Service -Name ssh-agent -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service -Name sshd -StartupType Automatic
Start-Service -Name ssh-agent -ErrorAction SilentlyContinue
Start-Service -Name sshd

Write-Step "Configuring Windows Firewall"
if (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue) {
  Enable-NetFirewallRule -Name "OpenSSH-Server-In-TCP" | Out-Null
} else {
  New-NetFirewallRule `
    -Name "OpenSSH-Server-In-TCP" `
    -DisplayName "OpenSSH Server (sshd)" `
    -Enabled True `
    -Direction Inbound `
    -Protocol TCP `
    -Action Allow `
    -LocalPort 22 | Out-Null
}

Write-Step "Checking Tailscale"
$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $tailscale) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget is not available on this PC, so Tailscale could not be installed automatically."
  }

  winget install --id Tailscale.Tailscale -e --accept-package-agreements --accept-source-agreements --disable-interactivity
}

$localIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1 -ExpandProperty IPAddress

$tailscaleIp = ""
$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if ($tailscale) {
  try {
    $tailscaleIp = (tailscale ip -4 2>$null | Select-Object -First 1).Trim()
  } catch {
    $tailscaleIp = ""
  }
}

Write-Step "Testing local SSH"
$sshTest = Test-NetConnection -ComputerName "localhost" -Port 22 -WarningAction SilentlyContinue

Write-Host ""
Write-Host "REMOTE ACCESS READY" -ForegroundColor Green
Write-Host "Windows username: $env:USERNAME"
Write-Host "Computer name: $env:COMPUTERNAME"
Write-Host "Local IP: $localIp"
if ($tailscaleIp) {
  Write-Host "Tailscale IP: $tailscaleIp"
} else {
  Write-Host "Tailscale IP: not available yet. Open Tailscale and sign in on this PC and your phone."
}
Write-Host "SSH port: 22"
Write-Host "Localhost test: $($sshTest.TcpTestSucceeded)"
Write-Host ""
Write-Host "Phone setup in Termius:"
Write-Host "1. Add a new Host"
Write-Host "2. Protocol: SSH"
Write-Host "3. Address: use the Tailscale IP for remote access, or the Local IP on the same Wi-Fi"
Write-Host "4. Port: 22"
Write-Host "5. Username: $env:USERNAME"
Write-Host "6. Authentication: use your Windows password, or add a key later for a safer setup"
