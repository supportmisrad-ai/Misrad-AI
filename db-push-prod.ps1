# DB Push to Production - PowerShell Script
# דחיפת סכמה לפרודקשן

param(
    [switch]$Force,
    [switch]$AcceptLoss
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Misrad AI - DB Push to Production" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if .env.prod_backup exists
if (-not (Test-Path ".env.prod_backup")) {
    Write-Host "❌ שגיאה: הקובץ .env.prod_backup לא נמצא!" -ForegroundColor Red
    exit 1
}

# Read and parse .env.prod_backup
Write-Host "📖 קורא משתני סביבה מ-.env.prod_backup..." -ForegroundColor Blue

$envContent = Get-Content ".env.prod_backup" -Raw
$envLines = $envContent -split "`n"

$envVars = @{}
foreach ($line in $envLines) {
    if ($line -match "^([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
        Set-Item -Path "env:$key" -Value $value
    }
}

Write-Host "✅ נטענו $($envVars.Count) משתני סביבה" -ForegroundColor Green

# Check DATABASE_URL
if (-not $envVars["DATABASE_URL"]) {
    Write-Host "❌ שגיאה: DATABASE_URL לא נמצא בקובץ!" -ForegroundColor Red
    exit 1
}

# Show masked URL
$url = $envVars["DATABASE_URL"]
$maskedUrl = $url -replace "://[^:]+:[^@]+@", "://****:****@"
Write-Host "🔗 DATABASE_URL: $maskedUrl" -ForegroundColor Yellow

# Check for DIRECT_URL
if ($envVars["DIRECT_URL"]) {
    $directUrl = $envVars["DIRECT_URL"]
    $maskedDirect = $directUrl -replace "://[^:]+:[^@]+@", "://****:****@"
    Write-Host "🔗 DIRECT_URL:   $maskedDirect" -ForegroundColor Yellow
    
    # Use DIRECT_URL for Prisma
    Set-Item -Path "env:DATABASE_URL" -Value $directUrl
    Write-Host "   (משנה DATABASE_URL ל-DIRECT_URL לשימוש ב-Prisma)" -ForegroundColor Blue
}

# Confirmation for production
if (-not $Force) {
    Write-Host ""
    Write-Host "⚠️  אזהרת סכנה!" -ForegroundColor Red
    Write-Host "אתה עומד לשנות את מסד הנתונים של הפרודקשן!" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "הקלד YES כדי להמשיך"
    
    if ($confirm -ne "YES") {
        Write-Host "❌ פעולה בוטלה" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "🚀 מריץ prisma db push..." -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

$acceptLossFlag = ""
if ($AcceptLoss) {
    $acceptLossFlag = " --accept-data-loss"
}

try {
    npx prisma db push$acceptLossFlag
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ הפעולה הושלמה בהצלחה!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ הפעולה נכשלה עם קוד שגיאה: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ שגיאה: $_" -ForegroundColor Red
    exit 1
}
