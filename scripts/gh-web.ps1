$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot.Path

$cmd = Get-Command gh -ErrorAction SilentlyContinue
$gh = if ($cmd) { $cmd.Source } elseif (Test-Path (Join-Path $env:ProgramFiles "GitHub CLI\gh.exe")) {
  Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
} else { $null }

if (-not $gh) {
  Write-Host "GitHub CLI not found." -ForegroundColor Red
  exit 1
}

& $gh repo view --web
