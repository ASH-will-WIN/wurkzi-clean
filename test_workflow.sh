#!/bin/bash

# Generate unique identifiers
TIMESTAMP=$(date +%s)
HIRER_EMAIL="hirer_$TIMESTAMP@example.com"
WORKER_EMAIL="worker_$TIMESTAMP@example.com"
PASSWORD="securepassword123"

# 1. Register a new hirer
HIRER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$HIRER_EMAIL'",
    "password": "'$PASSWORD'",
    "name": "Test Hirer"
  }')

HIRER_UID=$(echo $HIRER_RESPONSE | jq -r '.user.id')
HIRER_TOKEN=$(echo $HIRER_RESPONSE | jq -r '.session.access_token')

# 2. Register a new worker
WORKER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$WORKER_EMAIL'",
    "password": "'$PASSWORD'",
    "name": "Test Worker"
  }')

WORKER_UID=$(echo $WORKER_RESPONSE | jq -r '.user.id')

# 3. Create a job as the new hirer
JOB_RESPONSE=$(curl -s -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HIRER_TOKEN" \
  -d '{
    "title": "Auto Job $TIMESTAMP",
    "initialDescription": "Automated job creation",
    "fullDescription": "Created by automated script",
    "address": "456 Auto St",
    "hirerId": "'$HIRER_UID'"
  }')

JOB_UID=$(echo $JOB_RESPONSE | jq -r '.id')

# 4. Create payment as the hirer
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HIRER_TOKEN" \
  -d '{
    "job_id": "'$JOB_UID'",
    "amount": 150.75,
    "hirer_id": "'$HIRER_UID'",
    "worker_id": "'$WORKER_UID'"
  }')

echo "Payment created:"
echo $PAYMENT_RESPONSE | jq

# 5. Verify payments
echo "All payments:"
curl -s -X GET http://localhost:5000/api/payments \
  -H "Authorization: Bearer $HIRER_TOKEN" | jq