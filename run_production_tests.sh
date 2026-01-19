#!/bin/bash

# Production Testing Script
# This script runs all tests in the correct order for production verification

set -e  # Exit on error

echo "=========================================="
echo "Production Testing Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5001}"
TEST_RESULTS_DIR="./test_results"
mkdir -p "$TEST_RESULTS_DIR"

# Function to run tests and capture results
run_test_suite() {
    local suite_name=$1
    local test_path=$2
    local output_file="$TEST_RESULTS_DIR/${suite_name}.txt"
    
    echo -e "${YELLOW}Running: $suite_name${NC}"
    if pytest "$test_path" -v --tb=short > "$output_file" 2>&1; then
        echo -e "${GREEN}✓ $suite_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ $suite_name FAILED${NC}"
        echo "Check $output_file for details"
        return 1
    fi
}

# Track failures
FAILED_TESTS=0

echo "=========================================="
echo "Phase 1: Unit Tests"
echo "=========================================="

run_test_suite "crypto_deposit_unit" "tests/test_crypto_deposit_unit.py" || ((FAILED_TESTS++))
run_test_suite "stripe_payment_unit" "tests/test_stripe_payment_unit.py" || ((FAILED_TESTS++))
run_test_suite "wallet_service" "tests/test_wallet_service.py" || ((FAILED_TESTS++))
run_test_suite "wallet_service_comprehensive" "tests/test_wallet_service_comprehensive.py" || ((FAILED_TESTS++))
run_test_suite "tron_client" "tests/test_tron_client.py" || ((FAILED_TESTS++))
run_test_suite "withdrawal_execution" "tests/test_withdrawal_execution.py" || ((FAILED_TESTS++))

echo ""
echo "=========================================="
echo "Phase 2: Integration Tests"
echo "=========================================="

run_test_suite "crypto_deposit_integration" "tests/test_crypto_deposit_integration.py" || ((FAILED_TESTS++))
run_test_suite "stripe_payment_integration" "tests/test_stripe_payment_integration.py" || ((FAILED_TESTS++))
run_test_suite "withdrawal_integration" "tests/test_withdrawal_integration.py" || ((FAILED_TESTS++))
run_test_suite "deposit_settlement" "tests/test_deposit_settlement.py" || ((FAILED_TESTS++))
run_test_suite "deposit_monitor" "tests/test_deposit_monitor.py" || ((FAILED_TESTS++))
run_test_suite "withdrawal_monitor" "tests/test_withdrawal_monitor.py" || ((FAILED_TESTS++))

echo ""
echo "=========================================="
echo "Phase 3: API Endpoint Tests"
echo "=========================================="

run_test_suite "api_endpoints" "tests/test_api_endpoints.py" || ((FAILED_TESTS++))
run_test_suite "payment_api_endpoints" "tests/test_payment_api_endpoints.py" || ((FAILED_TESTS++))

echo ""
echo "=========================================="
echo "Phase 4: Security & Reliability Tests"
echo "=========================================="

run_test_suite "security_audit" "tests/test_security_audit.py" || ((FAILED_TESTS++))
run_test_suite "idempotency" "tests/test_idempotency.py" || ((FAILED_TESTS++))

echo ""
echo "=========================================="
echo "Phase 5: Load Tests"
echo "=========================================="

run_test_suite "deposit_load" "tests/test_deposit_load.py" || ((FAILED_TESTS++))

echo ""
echo "=========================================="
echo "Phase 6: E2E Tests (Playwright)"
echo "=========================================="

if [ -n "$FRONTEND_URL" ]; then
    run_test_suite "e2e_playwright" "tests/e2e/test_playwright_wallet.py --base-url=$FRONTEND_URL" || ((FAILED_TESTS++))
else
    echo -e "${YELLOW}⚠ Skipping E2E tests (FRONTEND_URL not set)${NC}"
    echo "   Set FRONTEND_URL environment variable to run E2E tests"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All test suites PASSED${NC}"
    echo ""
    echo "Test results saved in: $TEST_RESULTS_DIR"
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS test suite(s) FAILED${NC}"
    echo ""
    echo "Failed test results saved in: $TEST_RESULTS_DIR"
    echo "Review the output files for details"
    exit 1
fi
