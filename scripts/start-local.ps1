$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ControlPlane = Join-Path $Root 'apps/control-plane'
$Flagship = Join-Path $Root 'apps/flagship'

Write-Host "`n[1/6] Entering control-plane..."
Set-Location $ControlPlane

if (-not (Test-Path '.venv')) {
  Write-Host '[2/6] Creating virtual environment...'
  python -m venv .venv
} else {
  Write-Host '[2/6] Virtual environment already exists.'
}

Write-Host '[3/6] Activating virtual environment and installing Python deps...'
& .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

Write-Host '[4/6] Seeding demo data...'
python demo_setup.py stable

Write-Host '[5/6] Preparing flagship env...'
Set-Location $Flagship
if (-not (Test-Path '.env.local') -and (Test-Path '.env.example')) {
  Copy-Item '.env.example' '.env.local'
}
if (Test-Path '.env.local') {
  $content = Get-Content '.env.local' -Raw
  if ($content -notmatch 'CASA_GOVERNANCE_API_URL=') {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
    $content += 'CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000' + "`n"
    Set-Content '.env.local' $content
  }
}
npm ci

Write-Host '[6/6] Starting services...'
Write-Host '- Governance API: http://127.0.0.1:5000'
Write-Host "- Flagship UI: open a second terminal and run: cd $Flagship; npm run dev`n"

Set-Location $ControlPlane
python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
