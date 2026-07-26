#!/usr/bin/env bash
set -euo pipefail

run_rollback_test() {
  local file="$1"
  local sentinel="$2"
  local label="$3"
  local output
  local status

  set +e
  output="$(supabase db query --local --file "$file" 2>&1)"
  status=$?
  set -e

  if [[ ${status} -ne 0 && "${output}" == *"${sentinel}"* ]]; then
    echo "${label} passed (transaction rolled back)."
    return 0
  fi

  echo "${output}"
  if [[ ${status} -eq 0 ]]; then
    echo "${label} did not emit the rollback sentinel."
    return 1
  fi

  return "${status}"
}

run_rollback_test \
  supabase/tests/business_risks.sql \
  BUSINESS_RISK_TESTS_PASSED \
  "Ledger business-risk integration tests"

run_rollback_test \
  supabase/tests/api_privileges.sql \
  API_PRIVILEGE_TESTS_PASSED \
  "API privilege integration tests"
