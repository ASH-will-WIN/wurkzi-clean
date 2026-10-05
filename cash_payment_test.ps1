<#
.SYNOPSIS
    Workzzy Cash Payment Test Script
.DESCRIPTION
    Tests the "Client Paid in Cash" workflow
.NOTES
    Version: 1.0
#>
$API_BASE = "http://localhost:5000"
$TIMESTAMP = (Get-Date).ToFileTime()
$HIRER_EMAIL = "hirer_cash_$TIMESTAMP@example.com"
$WORKER_EMAIL = "worker_cash_$TIMESTAMP@example.com"
$PASSWORD = "securepassword123"

Write-Host "`n=== WORKZZY CASH PAYMENT TEST ===" -ForegroundColor Cyan
Write-Host "Test Timestamp: $TIMESTAMP`n" -ForegroundColor Cyan

try {
    # 1. User Registration with proper roles
    Write-Host "1. Registering users..." -ForegroundColor Yellow
    
    # Register Hirer
    $hirer = Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $HIRER_EMAIL
        password = $PASSWORD
        name = "Cash Hirer"
        role = "hirer"
    } | ConvertTo-Json) -ContentType "application/json"
    
    # Register Worker
    $worker = Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $WORKER_EMAIL
        password = $PASSWORD
        name = "Cash Worker"
        role = "worker"
    } | ConvertTo-Json) -ContentType "application/json"
    
    # 2. Job Creation
    Write-Host "`n2. Creating job..." -ForegroundColor Yellow
    $job = Invoke-RestMethod "$API_BASE/api/jobs" -Method Post -Body (@{
        title = "Cash Job $TIMESTAMP"
        initialDescription = "Cash job description"
        fullDescription = "Full details for cash job"
        address = "123 Cash St"
        hirerId = $hirer.user.id
        price = 100
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{
        Authorization = "Bearer $($hirer.session.access_token)"
    }
    
    # 3. Worker applies (skipping deposit payment step if possible, or mocking it? 
    # Actually, apply endpoint creates intent status. We might need to fake deposit or just rely on backend not strictly enforcing it for simple flow testing?)
    # Wait, apply endpoint creates application with PENDING status.
    # We need to pay deposit unless we modified that logic?
    # Let's confirm Payment Intent for deposit first.
    
    Write-Host "`n3. Worker applying..." -ForegroundColor Yellow
    $applicationData = Invoke-RestMethod "$API_BASE/api/applications" -Method Post -Body (@{
        jobId = $job.id
        message = "Cash job please"
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }
    $applicationId = $applicationData.application.id

    Write-Host "`n3.5 Confirming deposit..." -ForegroundColor Yellow
    $confirmResponse = Invoke-RestMethod "$API_BASE/api/applications/$applicationId/confirm" -Method Post -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }

    # 4. Hirer accepts
    Write-Host "`n4. Hirer accepting..." -ForegroundColor Yellow
    $acceptedApp = Invoke-RestMethod "$API_BASE/api/applications/$applicationId/accept" -Method Patch -Headers @{
        Authorization = "Bearer $($hirer.session.access_token)"
    }

    # 5. Job Status check
    $jobStatus = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)" -Headers @{
        Authorization = "Bearer $($hirer.session.access_token)"
    }
    if ($jobStatus.status -ne "COMMITTED") { throw "Job not COMMITTED" }

    # 6. Worker Start
    Write-Host "`n6. Worker starting..." -ForegroundColor Yellow
    $started = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/start" -Method Patch -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }

    # 7. Worker Complete
    Write-Host "`n7. Worker completing..." -ForegroundColor Yellow
    $completed = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/complete" -Method Patch -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }

    # 8. MARK PAID IN CASH
    Write-Host "`n8. Marking as Paid in Cash (Worker)..." -ForegroundColor Magenta
    $cashResponse = Invoke-RestMethod "$API_BASE/api/payments/cash" -Method Post -Body (@{
        jobId = $job.id
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }

    Write-Host "Cash API Response: $($cashResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Gray

    # 9. Verify Final State
    Write-Host "`n9. Verifying final state..." -ForegroundColor Yellow
    
    # Check Job Status
    $finalJob = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)" -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }
    
    if ($finalJob.status -ne "COMPLETED") {
        Write-Host "ERROR: Job Status is $($finalJob.status) (Expected COMPLETED)" -ForegroundColor Red
    } else {
        Write-Host "SUCCESS: Job Status is COMPLETED" -ForegroundColor Green
    }

    # Check Payment Record
    $payments = Invoke-RestMethod "$API_BASE/api/payments?jobId=$($job.id)" -Headers @{
        Authorization = "Bearer $($worker.session.access_token)"
    }
    $cashPayment = $payments | Where-Object { $_.stripePaymentId -like "CASH_PAYMENT*" }

    if ($cashPayment) {
        Write-Host "Found Cash Payment Record: Yes" -ForegroundColor Green
        Write-Host "Amount: $($cashPayment.amount)" 
        Write-Host "Worker Amount: $($cashPayment.workerAmount)"
        Write-Host "Platform Fee: $($cashPayment.platformFee)"

        if ($cashPayment.platformFee -eq 0 -and $cashPayment.workerAmount -eq $cashPayment.amount) {
             Write-Host "SUCCESS: Payment split is correct (100% to worker, 0 fee)" -ForegroundColor Green
        } else {
             Write-Host "ERROR: Payment split incorrect!" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: No cash payment record found!" -ForegroundColor Red
    }

    Write-Host "`n=== CASH TEST COMPLETE ===" -ForegroundColor Cyan
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($streamReader.ReadToEnd())" -ForegroundColor Red
    }
}
