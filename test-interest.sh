#!/bin/bash

# Test script for monthly interest calculation
# Usage: ./test-interest.sh [month]

set -e

# Configuration
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Check if month parameter is provided
MONTH_PARAM=""
if [ -n "$1" ]; then
    MONTH_PARAM="-d '{\"month\": \"$1\"}'"
    echo "🗓️  Calculating interest for month: $1"
else
    echo "🗓️  Calculating interest for current month"
fi

echo "🚀 Calling monthly interest Edge Function..."

# Make the request
RESPONSE_CODE=$(curl -s -o response.json -w "%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/monthly-interest" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  $MONTH_PARAM)

echo "📊 Response code: $RESPONSE_CODE"

if [ "$RESPONSE_CODE" -eq 200 ]; then
    echo "✅ Success! Response:"
    cat response.json | jq . 2>/dev/null || cat response.json
else
    echo "❌ Error! Response:"
    cat response.json | jq . 2>/dev/null || cat response.json
    exit 1
fi

echo ""
echo "💡 Tip: Check the database to verify interest transactions were created"
echo "   You can use: supabase db reset --local (to see fresh data)"