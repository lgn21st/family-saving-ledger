#!/usr/bin/env bash
set -euo pipefail

set +e
output="$(
  supabase db query --local --file supabase/tests/business_risks.sql 2>&1
)"
status=$?
set -e

if [[ ${status} -ne 0 && "${output}" == *"BUSINESS_RISK_TESTS_PASSED"* ]]; then
  echo "Ledger business-risk integration tests passed (transaction rolled back)."
  exit 0
fi

echo "${output}"
if [[ ${status} -eq 0 ]]; then
  echo "Ledger business-risk integration tests did not emit the rollback sentinel."
  exit 1
fi

exit "${status}"
