# גיבוי מלא של כל הפרויקט
# מעתיק את כל הפרויקט (קוד + דאטאבייס + backups) למיקום חיצוני

param(
    [string]$BackupDestination = "D:\Backups\Misrad-AI",  # שנה את זה למיקום שלך!
    [switch]$IncludeNodeModules = $false
)

$projectPath = "C:\Projects\Misrad-AI"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "Misrad-AI_Full_$timestamp"
$fullBackupPath = Join-Path $BackupDestination $backupName

Write-Host "`n🔄 גיבוי מלא של הפרויקט..." -ForegroundColor Cyan
Write-Host "📅 תאריך: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host "📂 מקור: $projectPath" -ForegroundColor Gray
Write-Host "💾 יעד: $fullBackupPath`n" -ForegroundColor Gray

# צור תיקיית יעד אם לא קיימת
if (-not (Test-Path $BackupDestination)) {
    New-Item -ItemType Directory -Path $BackupDestination -Force | Out-Null
    Write-Host "📁 יצירת תיקיית גיבויים: $BackupDestination`n" -ForegroundColor Green
}

# 1. גיבוי דאטאבייס קודם
Write-Host "💾 שלב 1/3: גיבוי דאטאבייס..." -ForegroundColor Yellow
try {
    Push-Location $projectPath
    node scripts/auto-backup.js
    Write-Host "   ✅ גיבוי דאטאבייס הושלם`n" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  שגיאה בגיבוי דאטאבייס: $_`n" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# 2. העתקת כל הפרויקט
Write-Host "📦 שלב 2/3: מעתיק קבצי פרויקט..." -ForegroundColor Yellow

$excludeDirs = @(
    ".next",
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "playwright-report",
    "test-results"
)

# הוסף node_modules אם לא רוצים
if (-not $IncludeNodeModules) {
    $excludeDirs += "node_modules"
}

# צור את תיקיית הגיבוי
New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null

# העתק קבצים עם אקסלוד
$robocopyArgs = @(
    $projectPath,
    $fullBackupPath,
    "/MIR",  # Mirror (מחיקה ביעד אם לא במקור)
    "/R:2",  # 2 ניסיונות חוזרים
    "/W:5",  # 5 שניות המתנה בין ניסיונות
    "/MT:8", # 8 threads
    "/XD"    # Exclude directories
) + $excludeDirs + @(
    "/XF",   # Exclude files
    "*.log",
    "npm-debug.log*",
    ".DS_Store"
)

$result = & robocopy @robocopyArgs

# Robocopy exit codes: 0-7 = success, 8+ = error
if ($LASTEXITCODE -le 7) {
    Write-Host "   ✅ העתקה הושלמה`n" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  שגיאה בהעתקה (exit code: $LASTEXITCODE)`n" -ForegroundColor Yellow
}

# 3. יצירת metadata
Write-Host "📋 שלב 3/3: יצירת מידע נוסף..." -ForegroundColor Yellow

$metadata = @{
    timestamp = $timestamp
    date = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
    projectPath = $projectPath
    backupPath = $fullBackupPath
    includedNodeModules = $IncludeNodeModules
    gitBranch = (git -C $projectPath branch --show-current 2>$null)
    gitCommit = (git -C $projectPath rev-parse --short HEAD 2>$null)
}

$metadata | ConvertTo-Json | Out-File (Join-Path $fullBackupPath "backup-info.json") -Encoding UTF8
Write-Host "   ✅ מידע נשמר`n" -ForegroundColor Green

# 4. חישוב גודל
$size = (Get-ChildItem $fullBackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "✅ גיבוי מלא הושלם בהצלחה!`n" -ForegroundColor Green
Write-Host "📊 סיכום:" -ForegroundColor Cyan
Write-Host "   📁 מיקום: $fullBackupPath"
Write-Host "   💾 גודל: $([math]::Round($size, 2)) MB"
Write-Host "   🌿 Branch: $($metadata.gitBranch)"
Write-Host "   📝 Commit: $($metadata.gitCommit)"

# 5. ניקוי גיבויים ישנים (שמור 5 אחרונים)
Write-Host "`n🧹 מנקה גיבויים ישנים..." -ForegroundColor Yellow
$allBackups = Get-ChildItem $BackupDestination -Directory | 
    Where-Object { $_.Name -like "Misrad-AI_Full_*" } | 
    Sort-Object CreationTime -Descending

if ($allBackups.Count -gt 5) {
    $toDelete = $allBackups | Select-Object -Skip 5
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Recurse -Force
        Write-Host "   🗑️  נמחק: $($old.Name)" -ForegroundColor Gray
    }
    Write-Host "   ✅ נשארו 5 גיבויים אחרונים`n" -ForegroundColor Green
}

Write-Host "🎉 הכל מוכן! הגיבוי נמצא ב:`n   $fullBackupPath`n" -ForegroundColor Green
