# קריאת הקובץ
$content = Get-Content 'botules_5.rules' -Raw -Encoding UTF8

# בדיקה שהקובץ תקין
if ($content.Length -lt 1000) {
    Write-Error "קובץ קטן מדי - ייתכן שנפגע"
    exit 1
}

# עדכון 1: תיאור בתפריט הראשי
$oldDescription = "description:`4 חבילות, מ-149₪`"
$newDescription = "description:`נקסוס בלבד ₪149, חבילות מ-₪249`"

if ($content -like "*$oldDescription*") {
    $content = $content.Replace($oldDescription, $newDescription)
    Write-Host "✓ עודכן: תיאור חבילות בתפריט הראשי" -ForegroundColor Green
} else {
    Write-Warning "לא נמצא תיאור ישן - ייתכן שכבר עודכן"
}

# עדכון 2: Rule 22 - אני לבד - שינוי טקסט
# החלפת חלק מהטקסט הישן
$oldSolo = "חבילת Solo — בדיוק בשבילך"
$newSolo = "נקסוס בלבד — התחלה חכמה"

if ($content -like "*$oldSolo*") {
    $content = $content.Replace($oldSolo, $newSolo)
    Write-Host "✓ עודכן: כותרת Rule 22" -ForegroundColor Green
} else {
    Write-Warning "לא נמצא כותרת Solo ישנה"
}

# עדכון 3: הסרת האפשרות לבחירת מודולים ב-Solo
$oldModules = "בחר מודול:
• System — מכירות
• Social — שיווק
• Client OS — לקוחות
• Operations — תפעול"

$newModules = "מודול ניהול צוות ומשימות עם AI.
באפשרותך לשדרג לחבילה משולבת בכל עת."

if ($content -like "*$oldModules*") {
    $content = $content.Replace($oldModules, $newModules)
    Write-Host "✓ עודכן: תיאור מודולים ב-Rule 22" -ForegroundColor Green
} else {
    Write-Warning "לא נמצא טקסט מודולים ישן - ייתכן שצריך עדכון ידני"
}

# שמירה
Set-Content 'botules_5.rules' $content -NoNewline -Encoding UTF8
Write-Host "`nהקובץ נשמר בהצלחה!" -ForegroundColor Cyan
