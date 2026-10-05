# API Test Script for Workzzy
# This script registers a hirer and a worker, creates a job, and adds a payment.
# It uses PowerShell's native Invoke-RestMethod for a seamless experience without external dependencies.

# Generate unique identifiers
$TIMESTAMP = (Get-Date).ToFileTime()
$HIRER_EMAIL = "hirer_$TIMESTAMP@example.com"
$WORKER_EMAIL = "worker_$TIMESTAMP@example.com"
$PASSWORD = "securepassword123"

Write-Host "Starting API test..."
Write-Host "Hirer Email: $HIRER_EMAIL"
Write-Host "Worker Email: $WORKER_EMAIL"
Write-Host ""

# 1. Register a new hirer and get their ID and token
Write-Host "1. Registering new hirer..."
$HIRER_BODY = @{
    email = $HIRER_EMAIL
    password = $PASSWORD
    name = "Test Hirer"
}
$HIRER_RESPONSE = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType 'application/json' -Body (ConvertTo-Json $HIRER_BODY)

# Accessing properties directly from the PowerShell object
$HIRER_UID = $HIRER_RESPONSE.user.id
$HIRER_TOKEN = $HIRER_RESPONSE.session.access_token
Write-Host "Hirer Registered. User ID: $HIRER_UID"
Write-Host ""

# 2. Register a new worker and get their ID
Write-Host "2. Registering new worker..."
$WORKER_BODY = @{
    email = $WORKER_EMAIL
    password = $PASSWORD
    name = "Test Worker"
}
$WORKER_RESPONSE = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType 'application/json' -Body (ConvertTo-Json $WORKER_BODY)

$WORKER_UID = $WORKER_RESPONSE.user.id
Write-Host "Worker Registered. User ID: $WORKER_UID"
Write-Host ""

# 3. Create a job as the new hirer
Write-Host "3. Creating a job..."
$JOB_BODY = @{
    title = "Auto Job $TIMESTAMP"
    initialDescription = "Automated job creation"
    fullDescription = "Created by automated script"
    address = "456 Auto St"
    hirerId = $HIRER_UID
    price = 150
}
$JOB_RESPONSE = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/jobs -ContentType 'application/json' -Headers @{Authorization = "Bearer $HIRER_TOKEN"} -Body (ConvertTo-Json $JOB_BODY)

$JOB_UID = $JOB_RESPONSE.id
Write-Host "Job Created. Job ID: $JOB_UID"
Write-Host ""

# 4. Create payment as the hirer
Write-Host "4. Creating payment..."
$PAYMENT_BODY = @{
    job_id = $JOB_UID
    amount = 150.75
    hirer_id = $HIRER_UID
    worker_id = $WORKER_UID
}
$PAYMENT_RESPONSE = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/payments -ContentType 'application/json' -Headers @{Authorization = "Bearer $HIRER_TOKEN"} -Body (ConvertTo-Json $PAYMENT_BODY)

Write-Host "Payment created:"
$PAYMENT_RESPONSE | Format-List
Write-Host ""

# 5. Verify payments
Write-Host "5. Getting all payments..."
$ALL_PAYMENTS_RESPONSE = Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/payments -Headers @{Authorization = "Bearer $HIRER_TOKEN"}
Write-Host "All payments found for hirer:"
$ALL_PAYMENTS_RESPONSE | Format-List
