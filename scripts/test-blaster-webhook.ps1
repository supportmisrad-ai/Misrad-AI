#requires -Version 5.1
<#
.SYNOPSIS
    Test WAAM-It Blaster webhook integration with MISRAD AI
.DESCRIPTION
    Sends test payloads to the webhook endpoint to verify connectivity
.EXAMPLE
    .\test-blaster-webhook.ps1
    .\test-blaster-webhook.ps1 -Url "https://misrad-ai.com/api/webhooks/blaster" -Secret "my-secret"
#>

param(
    [string]$Url = "https://misrad-ai.com/api/webhooks/blaster",
    [string]$Secret = $env:BLASTER_WEBHOOK_SECRET
)

if (-not $Secret) {
    Write-Error "❌ Webhook secret not provided. Set BLASTER_WEBHOOK_SECRET environment variable or pass -Secret parameter"
    exit 1
}

$testPayloads = @{
    lead = @{
        phone = '972559296626'
        name = 'Test User'
        business = 'Test Company'
        industry = 'Technology'
        org_size = '1-10'
        pain_point = 'Customer Management'
        selected_plan = 'nexus_solo'
        email = 'test@example.com'
        message = 'Hi, I want to learn more about the system'
        rule_id = '1'
    }
    signup = @{
        phone = "972512345678"
        name = "משתמש חדש"
        business = "סטארטאפ ישראלי"
        email = "new@startup.co.il"
        selected_plan = "empire"
        message = "אני רוצה להירשם למערכת"
        rule_id = "37"
    }
    demo = @{
        phone = "972523456789"
        name = "לקוח פוטנציאלי"
        business = "חברת ייעוץ"
        message = "אני רוצה הדגמה של המערכת"
        rule_id = "43"
    }
    support = @{
        phone = "972534567890"
        name = "לקוח קיים"
        message = "יש לי בעיה עם החשבון שלי"
        rule_id = "63"
    }
}

function Test-Webhook {
    param($Type, $Payload)
    
    Write-Host "`n🧪 Testing $Type..." -NoNewline
    
    try {
        $body = $Payload | ConvertTo-Json -Depth 10
        $headers = @{
            "Content-Type" = "application/json"
            "x-webhook-secret" = $Secret
        }
        
        $uri = "$Url`?type=$Type"
        $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body -ErrorAction Stop
        
        Write-Host " ✅ Success" -ForegroundColor Green
        Write-Host "   Lead ID: $($response.leadId)" -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Host " ❌ Failed" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

# Header
Write-Host ("═" * 60) -ForegroundColor Cyan
Write-Host "  WAAM-It Blaster Webhook Test Suite" -ForegroundColor Cyan
Write-Host ("═" * 60) -ForegroundColor Cyan
Write-Host "`n🌐 URL: $Url"
Write-Host "🔑 Secret: $($Secret.Substring(0, [Math]::Min(10, $Secret.Length)))..."

# Run tests
$results = @()
foreach ($test in $testPayloads.GetEnumerator()) {
    $results += Test-Webhook -Type $test.Key -Payload $test.Value
}

# Summary
Write-Host "`n$('═' * 60)" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_ }).Count
$total = $results.Count
$color = if ($passed -eq $total) { "Green" } else { "Yellow" }
Write-Host "  Results: $passed/$total tests passed" -ForegroundColor $color
Write-Host ("═" * 60) -ForegroundColor Cyan

exit ($passed -eq $total ? 0 : 1)
