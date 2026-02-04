# הגדרת גיבוי יומי אוטומטי ב-Windows Task Scheduler
# הרץ את זה פעם אחת ב-PowerShell (כ-Administrator)

$taskName = "Misrad-AI Daily Backup"
$projectPath = "C:\Projects\Misrad-AI"
$scriptPath = "$projectPath\scripts\auto-backup.js"

# בדוק אם המשימה כבר קיימת
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  המשימה כבר קיימת. מוחק..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Write-Host "📅 יוצר משימה מתוזמנת..." -ForegroundColor Cyan

# יצירת Action - מה להריץ
$action = New-ScheduledTaskAction `
    -Execute "node.exe" `
    -Argument "`"$scriptPath`"" `
    -WorkingDirectory $projectPath

# יצירת Trigger - מתי להריץ (כל יום ב-9:00 בבוקר)
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

# הגדרות נוספות
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# יצירת המשימה
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "גיבוי יומי אוטומטי של דאטאבייס Misrad-AI" `
    -User $env:USERNAME

Write-Host "`n✅ המשימה נוצרה בהצלחה!" -ForegroundColor Green
Write-Host "`n📋 פרטים:" -ForegroundColor Cyan
Write-Host "   שם: $taskName"
Write-Host "   זמן הרצה: כל יום ב-9:00 בבוקר"
Write-Host "   נתיב: $scriptPath"
Write-Host "`n💡 כדי לראות את המשימה:" -ForegroundColor Yellow
Write-Host "   פתח Task Scheduler → Task Scheduler Library"
Write-Host "   חפש: $taskName"
Write-Host "`n🧪 לבדיקה ידנית:" -ForegroundColor Yellow
Write-Host "   לחץ ימני על המשימה → Run"
Write-Host "`n⚙️  לשנות שעה:" -ForegroundColor Yellow
Write-Host "   לחץ ימני → Properties → Triggers → Edit"
Write-Host ""
