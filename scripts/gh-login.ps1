# GitHub login using full path to gh.exe when PATH is not updated (common after install).
$ErrorActionPreference = "Continue"

function Resolve-GhExe {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $p64 = Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
  if (Test-Path $p64) {
    return $p64
  }
  $p32 = Join-Path ${env:ProgramFiles(x86)} "GitHub CLI\gh.exe"
  if (Test-Path $p32) {
    return $p32
  }
  return $null
}

$gh = Resolve-GhExe
if (-not $gh) {
  Write-Host ""
  Write-Host "GitHub CLI not found. Install with:" -ForegroundColor Red
  Write-Host "  winget install GitHub.cli" -ForegroundColor White
  Write-Host ""
  Write-Host "Then close and reopen this terminal, or run: npm run git:login" -ForegroundColor Gray
  Write-Host ""
  exit 1
}

Write-Host ""
Write-Host "Using: $gh" -ForegroundColor Gray
Write-Host "Choose GitHub.com, HTTPS, then login with browser." -ForegroundColor Cyan
Write-Host ""

& $gh auth login
