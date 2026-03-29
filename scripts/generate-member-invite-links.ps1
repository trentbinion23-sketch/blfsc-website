param(
  [Parameter(Mandatory = $true)]
  [string]$InputFile,

  [string]$OutputFile = "member-invite-links.csv",

  [string]$RedirectTo = $env:INVITE_REDIRECT_TO,

  [string]$SupabaseUrl = $env:SUPABASE_URL,

  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
  param([string]$PathValue)

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue
  }

  return (Join-Path -Path (Get-Location) -ChildPath $PathValue)
}

function Read-MemberEmails {
  param([string]$PathValue)

  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "Input file not found: $PathValue"
  }

  $emails = @(
    Get-Content -LiteralPath $PathValue |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ -and -not $_.StartsWith("#") } |
      Sort-Object -Unique
  )

  if (-not $emails.Count) {
    throw "No member emails were found in $PathValue"
  }

  $invalid = $emails | Where-Object { $_ -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$' }
  if ($invalid) {
    throw "Invalid email address(es) found: $($invalid -join ', ')"
  }

  return $emails
}

function Build-InviteResult {
  param(
    [string]$Email,
    [string]$Status,
    [string]$RedirectValue,
    [string]$ActionLink,
    [string]$UserId,
    [string]$InvitedAt,
    [string]$Message
  )

  return [PSCustomObject]@{
    email       = $Email
    status      = $Status
    redirect_to = $RedirectValue
    action_link = $ActionLink
    user_id     = $UserId
    invited_at  = $InvitedAt
    message     = $Message
  }
}

$inputPath = Resolve-AbsolutePath $InputFile
$outputPath = Resolve-AbsolutePath $OutputFile
$emails = Read-MemberEmails $inputPath

if (-not $RedirectTo) {
  throw "RedirectTo is required. Pass -RedirectTo or set INVITE_REDIRECT_TO."
}

if (-not $DryRun) {
  if (-not $SupabaseUrl) {
    throw "SupabaseUrl is required. Pass -SupabaseUrl or set SUPABASE_URL."
  }

  if (-not $ServiceRoleKey) {
    throw "ServiceRoleKey is required. Pass -ServiceRoleKey or set SUPABASE_SERVICE_ROLE_KEY."
  }
}

$results = @(
  foreach ($email in $emails) {
  if ($DryRun) {
    Build-InviteResult `
      -Email $email `
      -Status "dry_run" `
      -RedirectValue $RedirectTo `
      -ActionLink "" `
      -UserId "" `
      -InvitedAt "" `
      -Message "Validated only. No invite link was created."
    continue
  }

  $adminUrl = "$($SupabaseUrl.TrimEnd('/'))/auth/v1/admin/generate_link"
  $headers = @{
    Authorization = "Bearer $ServiceRoleKey"
    apikey        = $ServiceRoleKey
    "Content-Type" = "application/json"
  }
  $payload = @{
    type        = "invite"
    email       = $email
    redirect_to = $RedirectTo
  } | ConvertTo-Json -Compress

  try {
    $response = Invoke-RestMethod -Method Post -Uri $adminUrl -Headers $headers -Body $payload

    Build-InviteResult `
      -Email $email `
      -Status "invite_created" `
      -RedirectValue ($response.redirect_to ?? $RedirectTo) `
      -ActionLink ($response.action_link ?? "") `
      -UserId ($response.id ?? "") `
      -InvitedAt ($response.invited_at ?? "") `
      -Message "Send this link only to the matching member email."
  } catch {
    $errorMessage = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $errorMessage = $_.ErrorDetails.Message
    }

    Build-InviteResult `
      -Email $email `
      -Status "error" `
      -RedirectValue $RedirectTo `
      -ActionLink "" `
      -UserId "" `
      -InvitedAt "" `
      -Message $errorMessage
  }
}
)

$results | Export-Csv -LiteralPath $outputPath -NoTypeInformation

$successCount = @($results | Where-Object { $_.status -eq "invite_created" }).Count
$errorCount = @($results | Where-Object { $_.status -eq "error" }).Count
$dryRunCount = @($results | Where-Object { $_.status -eq "dry_run" }).Count

Write-Output "Processed $($results.Count) email(s)."
if ($DryRun) {
  Write-Output "Dry run only. No invite links were created."
} else {
  Write-Output "Invite links created: $successCount"
  Write-Output "Errors: $errorCount"
}
Write-Output "Output saved to: $outputPath"
