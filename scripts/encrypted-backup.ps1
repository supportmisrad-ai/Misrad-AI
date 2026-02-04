# גיבוי מוצפן לענן
# יוצר גיבוי מלא + מצפין אותו עם 7-Zip לפני העלאה

param(
    [string]$BackupDestination = "$env:OneDrive\Backups\Misrad-AI",
    [string]$Password = "",  # יוגדר אוטומטית אם ריק
    [switch]$SkipEncryption = $false
)

$projectPath = "C:\Projects\Misrad-AI"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "`n🔐 גיבוי מוצפן של הפרויקט`n" -ForegroundColor Cyan

# בדוק אם 7-Zip מותקן
$7zipPath = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $7zipPath) -and -not $SkipEncryption) {
    Write-Host "❌ 7-Zip לא מותקן!`n" -ForegroundColor Red
    Write-Host "💡 אפשרויות:" -ForegroundColor Yellow
    Write-Host "   1. התקן 7-Zip: https://www.7-zip.org/" -ForegroundColor Gray
    Write-Host "   2. הרץ בלי הצפנה: -SkipEncryption`n" -ForegroundColor Gray
    exit 1
}

# 1. צור גיבוי רגיל קודם
Write-Host "📦 שלב 1/3: יוצר גיבוי מלא...`n" -ForegroundColor Yellow
$tempBackupPath = Join-Path $env:TEMP "Misrad-AI_Temp_$timestamp"

try {
    & "$projectPath\scripts\full-project-backup.ps1" -BackupDestination $env:TEMP
    
    # מצא את התיקייה שנוצרה
    $createdBackup = Get-ChildItem $env:TEMP -Directory | 
        Where-Object { $_.Name -like "Misrad-AI_Full_*" } | 
        Sort-Object CreationTime -Descending | 
        Select-Object -First 1
    
    if (-not $createdBackup) {
        throw "לא נמצא גיבוי שנוצר"
    }
    
    $tempBackupPath = $createdBackup.FullName
    Write-Host "   ✅ גיבוי נוצר: $tempBackupPath`n" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ שגיאה ביצירת גיבוי: $_`n" -ForegroundColor Red
    exit 1
}

if ($SkipEncryption) {
    Write-Host "⚠️  מדלג על הצפנה (SkipEncryption)`n" -ForegroundColor Yellow
    # פשוט העתק ליעד
    $finalDest = Join-Path $BackupDestination (Split-Path $tempBackupPath -Leaf)
    Copy-Item $tempBackupPath $finalDest -Recurse -Force
    Write-Host "✅ הועתק ל: $finalDest`n" -ForegroundColor Green
    exit 0
}

# 2. הצפן עם 7-Zip
Write-Host "🔐 שלב 2/3: מצפין...`n" -ForegroundColor Yellow

# צור או קבל סיסמה
if ([string]::IsNullOrEmpty($Password)) {
    # צור סיסמה אוטומטית ושמור בקובץ מאובטח
    $passwordFile = Join-Path $projectPath ".backup-password.txt"
    
    if (Test-Path $passwordFile) {
        $Password = Get-Content $passwordFile -Raw
        Write-Host "   🔑 משתמש בסיסמה שמורה`n" -ForegroundColor Gray
    } else {
        # צור סיסמה חזקה אקראית
        $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"
        $Password = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
        $Password | Out-File $passwordFile -NoNewline -Encoding UTF8
        
        Write-Host "   🔑 נוצרה סיסמה חדשה ונשמרה ב: .backup-password.txt" -ForegroundColor Yellow
        Write-Host "   ⚠️  שמור את הקובץ הזה במקום בטוח! בלעדיו לא תוכל לשחזר!`n" -ForegroundColor Red
    }
}

# צור ארכיון מוצפן
$encryptedFile = Join-Path $BackupDestination "Misrad-AI_Encrypted_$timestamp.7z"

# וודא שהתיקייה קיימת
if (-not (Test-Path $BackupDestination)) {
    New-Item -ItemType Directory -Path $BackupDestination -Force | Out-Null
}

# הצפן
$arguments = @(
    "a",                    # Add to archive
    "-t7z",                 # 7z format
    "-p$Password",          # Password
    "-mhe=on",              # Encrypt headers
    "-mx=5",                # Compression level (0-9, 5=normal)
    $encryptedFile,         # Output file
    "$tempBackupPath\*"     # Input
)

& $7zipPath $arguments | Out-Null

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $encryptedFile).Length / 1MB
    Write-Host "   ✅ הוצפן בהצלחה: $([math]::Round($size, 2)) MB`n" -ForegroundColor Green
} else {
    Write-Host "   ❌ שגיאה בהצפנה (exit code: $LASTEXITCODE)`n" -ForegroundColor Red
    exit 1
}

# 3. נקה את הגיבוי הזמני
Write-Host "🧹 שלב 3/3: מנקה קבצים זמניים...`n" -ForegroundColor Yellow
Remove-Item $tempBackupPath -Recurse -Force
Write-Host "   ✅ נוקה`n" -ForegroundColor Green

# 4. ניקוי גיבויים ישנים (שמור 5)
$allEncrypted = Get-ChildItem $BackupDestination -Filter "Misrad-AI_Encrypted_*.7z" | 
    Sort-Object CreationTime -Descending

if ($allEncrypted.Count -gt 5) {
    Write-Host "🧹 מנקה גיבויים ישנים..." -ForegroundColor Yellow
    $toDelete = $allEncrypted | Select-Object -Skip 5
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        Write-Host "   🗑️  נמחק: $($old.Name)" -ForegroundColor Gray
    }
    Write-Host "   ✅ נשארו 5 גיבויים אחרונים`n" -ForegroundColor Green
}

Write-Host "✅ גיבוי מוצפן הושלם בהצלחה!`n" -ForegroundColor Green
Write-Host "📊 סיכום:" -ForegroundColor Cyan
Write-Host "   📁 מיקום: $encryptedFile"
Write-Host "   💾 גודל: $([math]::Round((Get-Item $encryptedFile).Length / 1MB, 2)) MB"
Write-Host "   🔐 מוצפן: כן (AES-256)"
Write-Host "   🔑 סיסמה: .backup-password.txt`n"

Write-Host "💡 לשחזור:" -ForegroundColor Yellow
Write-Host "   1. פתח את הקובץ עם 7-Zip"
Write-Host "   2. הזן את הסיסמה מ-.backup-password.txt"
Write-Host "   3. חלץ את התיקייה`n"
