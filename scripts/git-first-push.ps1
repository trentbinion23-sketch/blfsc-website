# Publishes this folder to GitHub with one command after `gh auth login`.
# Usage (from repo root):
#   npm run git:publish
#   npm run git:publish:force    # uses --force-with-lease if remote already has commits
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot.Path

function Write-Step([string]$msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Test-GhAuth {
  gh auth status 2>&1 | Out-Null
  return $LASTEXITCODE -eq 0
}

$dirty = git status --porcelain
if ($dirty) {
  Write-Host "`nUncommitted changes — commit or stash first, then run again:`n" -ForegroundColor Yellow
  Write-Host "  git add -A" -ForegroundColor White
  Write-Host "  git commit -m `"chore: describe your change`"`n" -ForegroundColor White
  exit 1
}

git remote get-url origin 2>$null | Out-Null
$hasOrigin = ($LASTEXITCODE -eq 0)

if (-not $hasOrigin) {
  Write-Step "No Git remote yet"
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Install GitHub CLI: winget install GitHub.cli" -ForegroundColor Red
    exit 1
  }
  if (-not (Test-GhAuth)) {
    Write-Host "`nOne-time login (opens browser):" -ForegroundColor Yellow
    Write-Host "  gh auth login`n" -ForegroundColor White
    Write-Host "Choose: GitHub.com -> HTTPS -> Login with browser." -ForegroundColor Gray
    Write-Host "Then run: npm run git:publish`n" -ForegroundColor White
    exit 1
  }

  $dirName = Split-Path $repoRoot.Path -Leaf
  Write-Step "Creating private repo '$dirName' on your account and pushing main..."
  gh repo create $dirName --private --source=. --remote=origin --push --description "BLFSC site (blfsc.com)"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`nIf the repo name is taken, create it on github.com then run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOU/REPO.git" -ForegroundColor White
    Write-Host "  npm run git:publish`n" -ForegroundColor White
    exit $LASTEXITCODE
  }
  Write-Host "`nDone. Open the URL shown above or run: gh repo view --web`n" -ForegroundColor Green
  exit 0
}

Write-Step "Pushing to origin (branch main)..."
if ($Force) {
  git push -u origin main --force-with-lease
} else {
  git push -u origin main
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "`nPush failed. If GitHub already has different commits and you mean to replace them:" -ForegroundColor Yellow
  Write-Host "  npm run git:publish:force`n" -ForegroundColor White
  exit $LASTEXITCODE
}

Write-Host "`nPush OK.`n" -ForegroundColor Green
