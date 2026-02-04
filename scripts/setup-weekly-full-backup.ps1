# הגדרת גיבוי מלא שבועי אוטומטי
# הרץ פעם אחת ב-PowerShell (כ-Administrator)

param(
    [string]$BackupDestination = "D:\Backups\Misrad-AI"  # שנה את זה!
)

$taskName = "Misrad-AI Weekly Full Backup"
$projectPath = "C:\Projects\Misrad-AI"
$scriptPath = "$projectPath\scripts\full-project-backup.ps1"

Write-Host "`n⚙️  הגדרת גיבוי מלא שבועי...`n" -ForegroundColor Cyan

# בדוק שהנתיב קיים
if (-not (Test-Path $projectPath)) {
    Write-Host "❌ שגיאה: נתיב הפרויקט לא קיים: $projectPath" -ForegroundColor Red
    exit 1
}

# שאל את המשתמש על מיקום הגיבוי
Write-Host "📂 מיקום גיבוי נוכחי: $BackupDestination" -ForegroundColor Yellow
Write-Host "💡 אפשרויות מומלצות:" -ForegroundColor Gray
Write-Host "   - דיסק חיצוני: D:\Backups\Misrad-AI" -ForegroundColor Gray
Write-Host "   - OneDrive: $env:OneDrive\Backups\Misrad-AI" -ForegroundColor Gray
Write-Host "   - Google Drive: G:\My Drive\Backups\Misrad-AI`n" -ForegroundColor Gray

$confirm = Read-Host "להמשיך עם המיקום הזה? (y/n)"
if ($confirm -ne 'y') {
    $BackupDestination = Read-Host "הזן מיקום חדש"
}

# בדוק אם המשימה כבר קיימת
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "`n⚠️  המשימה כבר קיימת. מוחק...`n" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# יצירת Action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -BackupDestination `"$BackupDestination`"" `
    -WorkingDirectory $projectPath

# יצירת Trigger - כל יום ראשון ב-2:00 בלילה
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2:00AM

# הגדרות
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# יצירת המשימה
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "גיבוי מלא שבועי של פרויקט Misrad-AI (קוד + דאטאבייס + backups)" `
    -User $env:USERNAME `
    -RunLevel Highest

Write-Host "`n✅ המשימה נוצרה בהצלחה!`n" -ForegroundColor Green
Write-Host "📋 פרטים:" -ForegroundColor Cyan
Write-Host "   שם: $taskName"
Write-Host "   זמן: כל יום ראשון ב-2:00 בלילה"
Write-Host "   יעד: $BackupDestination"
Write-Host "   שומר: 5 גיבויים אחרונים"

Write-Host "`n💡 לבדיקה ידנית עכשיו:" -ForegroundColor Yellow
Write-Host "   .\scripts\full-project-backup.ps1 -BackupDestination `"$BackupDestination`"`n"
