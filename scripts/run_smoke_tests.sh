#!/bin/bash

# Production Smoke Tests Script
# Automated basic smoke tests for production deployment

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:5001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

test_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Test 1: Database Health Check
test_db_health() {
    log_info "Testing database health..."
    if curl -s -f "${API_BASE_URL}/api/admin/system/health/db" > /dev/null 2>&1; then
        response=$(curl -s "${API_BASE_URL}/api/admin/system/health/db")
        if echo "$response" | grep -q '"status": "healthy"'; then
            test_pass "Database health check"
        else
            test_fail "Database health check - unexpected response: $response"
        fi
    else
        test_fail "Database health check - endpoint unreachable"
    fi
}

# Test 2: API Service Health
test_api_health() {
    log_info "Testing API service..."
    if curl -s -f "${API_BASE_URL}/api/health" > /dev/null 2>&1; then
        test_pass "API service reachable"
    else
        test_fail "API service unreachable"
    fi
}

# Test 3: Admin Authentication
test_admin_auth() {
    log_info "Testing admin authentication..."

    # Try to access admin endpoint without auth
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/admin/stats")
    if [ "$response" = "401" ]; then
        test_pass "Admin endpoint requires authentication"
    else
        test_fail "Admin endpoint authentication check failed (status: $response)"
    fi
}

# Test 4: Rate Limiting
test_rate_limiting() {
    log_info "Testing rate limiting..."

    # Make multiple rapid requests to auth endpoint
    failed_count=0
    for i in {1..5}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@example.com","password":"test123"}' \
            "${API_BASE_URL}/api/auth/login")
        if [ "$response" = "429" ]; then
            ((failed_count++))
        fi
        sleep 0.1
    done

    if [ "$failed_count" -gt 0 ]; then
        test_pass "Rate limiting is active"
    else
        test_fail "Rate limiting not detected"
    fi
}

# Test 5: SSL Certificate (if HTTPS)
test_ssl_cert() {
    if [[ "$API_BASE_URL" == https://* ]]; then
        log_info "Testing SSL certificate..."
        if curl -s -f --connect-timeout 10 "${API_BASE_URL}/api/admin/system/health/db" > /dev/null 2>&1; then
            test_pass "SSL certificate valid"
        else
            test_fail "SSL certificate validation failed"
        fi
    else
        log_warn "Skipping SSL test - not using HTTPS"
    fi
}

# Test 6: Worker Heartbeats
test_worker_heartbeats() {
    log_info "Testing worker heartbeats..."

    # Get system health which includes heartbeats
    response=$(curl -s "${API_BASE_URL}/api/admin/system/health" \
        -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "")

    if echo "$response" | grep -q '"heartbeats"'; then
        test_pass "Worker heartbeats available"
    else
        test_fail "Worker heartbeats not found"
    fi
}

# Test 7: Reconciliation System
test_reconciliation() {
    log_info "Testing reconciliation system..."

    # Try to get latest reconciliation report
    response=$(curl -s "${API_BASE_URL}/api/admin/system/reconciliation/latest" \
        -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "")

    # Even if no reports exist yet, endpoint should respond
    if [ -n "$response" ]; then
        test_pass "Reconciliation endpoint accessible"
    else
        test_fail "Reconciliation endpoint not accessible"
    fi
}

# Main test execution
main() {
    echo "========================================"
    echo "Sports Betting Platform Smoke Tests"
    echo "========================================"
    echo "API Base URL: $API_BASE_URL"
    echo "Started at: $(date)"
    echo ""

    # Run all tests
    test_db_health
    test_api_health
    test_admin_auth
    test_rate_limiting
    test_ssl_cert
    test_worker_heartbeats
    test_reconciliation

    echo ""
    echo "========================================"
    echo "Test Results Summary"
    echo "========================================"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}OVERALL STATUS: PASS${NC}"
        echo "All basic smoke tests passed!"
        exit 0
    else
        echo -e "${RED}OVERALL STATUS: FAIL${NC}"
        echo "$FAILED_TESTS tests failed - manual investigation required"
        exit 1
    fi
}

# Run main function
main "$@"