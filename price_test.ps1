<#
.SYNOPSIS
    Workzzy Price Enforcement Test
.DESCRIPTION
    Tests that the backend enforces the job price during final payment
.NOTES
    Version: 1.0
#>
$API_BASE = "http://localhost:5000"
$TIMESTAMP = (Get-Date).ToFileTime()
$HIRER_EMAIL = "hirer_price_$TIMESTAMP@example.com"
$WORKER_EMAIL = "worker_price_$TIMESTAMP@example.com"
$PASSWORD = "securepassword123"

Write-Host "`n=== WORKZZY PRICE ENFORCEMENT TEST ===" -ForegroundColor Cyan

try {
    # 1. Register Users
    Write-Host "1. Registering users..." -ForegroundColor Yellow
    $hirer = Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $HIRER_EMAIL; password = $PASSWORD; name = "Price Hirer"; role = "hirer"
    } | ConvertTo-Json) -ContentType "application/json"
    
    $worker = Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $WORKER_EMAIL; password = $PASSWORD; name = "Price Worker"; role = "worker"
    } | ConvertTo-Json) -ContentType "application/json"

    # 2. Create Job with Price $100
    Write-Host "`n2. Creating job with price `$100..." -ForegroundColor Yellow
    $job = Invoke-RestMethod "$API_BASE/api/jobs" -Method Post -Body (@{
        title = "Price Test Job"; initialDescription = "Desc"; fullDescription = "Full Desc";
        address = "123 St"; hirerId = $hirer.user.id; price = 100
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($hirer.session.access_token)" }

    # 3. Worker Apply & Hirer Accept (Standard Flow)
    Write-Host "`n3. Application flow..." -ForegroundColor Yellow
    $appData = Invoke-RestMethod "$API_BASE/api/applications" -Method Post -Body (@{
        jobId = $job.id; message = "Apply"
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    
    # Confirm deposit
    Invoke-RestMethod "$API_BASE/api/applications/$($appData.application.id)/confirm" -Method Post -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    
    # Accept
    Invoke-RestMethod "$API_BASE/api/applications/$($appData.application.id)/accept" -Method Patch -Headers @{ Authorization = "Bearer $($hirer.session.access_token)" }

    # 4. Start and Complete Job
    Write-Host "`n4. Completing job..." -ForegroundColor Yellow
    Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/start" -Method Patch -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/complete" -Method Patch -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }

    # 5. ATTEMPT FINAL PAYMENT WITH WRONG AMOUNT ($50)
    Write-Host "`n5. Attempting to pay `$50 (Should fail or be overridden to `$100)..." -ForegroundColor Magenta
    $paymentResponse = Invoke-RestMethod "$API_BASE/api/payments/final" -Method Post -Body (@{
        jobId = $job.id
        amount = 50.00 # TRYING TO UNDERPAY
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($hirer.session.access_token)" }

    # 6. Verify Payment Amount
    Write-Host "`n6. Verifying Payment Amount..." -ForegroundColor Yellow
    $actualAmount = $paymentResponse.payment.amount
    Write-Host "Requested Amount: `$50"
    Write-Host "Actual Processed Amount: `$$actualAmount"

    if ($actualAmount -eq 100) {
        Write-Host "SUCCESS: System enforced job price of `$100!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: System allowed payment of `$$actualAmount!" -ForegroundColor Red
        throw "Price enforcement failed"
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
