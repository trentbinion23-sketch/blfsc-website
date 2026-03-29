# Publishes this folder to GitHub after GitHub CLI login (npm run git:login).
# Usage (from repo root):
#   npm run git:publish
#   npm run git:publish:force    # uses --force-with-lease if remote already has commits
param(
  [switch]$Force
)

# Continue: git writes to stderr when origin is missing; we only check $LASTEXITCODE.
$ErrorActionPreference = "Continue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot.Path

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

$GhExe = Resolve-GhExe

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-GhAuth {
  & $GhExe auth status 2>&1 | Out-Null
  return $LASTEXITCODE -eq 0
}

$dirty = git status --porcelain
if ($dirty) {
  Write-Host ""
  Write-Host 'Uncommitted changes: commit or stash first, then run again:' -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  git add -A" -ForegroundColor White
  Write-Host '  git commit -m "chore: describe your change"' -ForegroundColor White
  Write-Host ""
  exit 1
}

git remote get-url origin 2>$null | Out-Null
$hasOrigin = ($LASTEXITCODE -eq 0)

if (-not $hasOrigin) {
  Write-Step "No Git remote yet"
  if (-not $GhExe) {
    Write-Host "GitHub CLI not found. Install: winget install GitHub.cli" -ForegroundColor Red
    Write-Host "Then run: npm run git:login" -ForegroundColor White
    exit 1
  }
  if (-not (Test-GhAuth)) {
    Write-Host ""
    Write-Host 'GitHub CLI is installed but you are not logged in yet.' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  npm run git:login" -ForegroundColor White
    Write-Host ""
    Write-Host '(If `gh` was not recognized before, this script still finds gh.exe under Program Files.)' -ForegroundColor Gray
    Write-Host ""
    exit 1
  }

  $dirName = Split-Path $repoRoot.Path -Leaf
  Write-Step "Creating private repo '$dirName' on your account and pushing main..."
  & $GhExe repo create $dirName --private --source=. --remote=origin --push --description "BLFSC site (blfsc.com)"
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "If the repo name is taken, create it on github.com then run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOU/REPO.git" -ForegroundColor White
    Write-Host "  npm run git:publish" -ForegroundColor White
    Write-Host ""
    exit $LASTEXITCODE
  }
  Write-Host ""
  Write-Host "Done. Open the URL shown above or run: npm run git:web" -ForegroundColor Green
  Write-Host ""
  exit 0
}

Write-Step "Pushing to origin (branch main)..."
if ($Force) {
  git push -u origin main --force-with-lease
} else {
  git push -u origin main
}

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Push failed. If GitHub already has different commits and you mean to replace them:" -ForegroundColor Yellow
  Write-Host "  npm run git:publish:force" -ForegroundColor White
  Write-Host ""
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host 'Push OK.' -ForegroundColor Green
Write-Host ""
