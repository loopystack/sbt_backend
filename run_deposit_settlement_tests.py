#!/usr/bin/env python3
"""
Deposit Settlement Test Suite Runner
Runs all unit and integration tests for deposit settlement and ledger correctness

Tests covered:
- Deposit settlement service (idempotency, ledger correctness)
- Deposit monitor worker (confirmation and settlement integration)
- Crypto deposit integration (full lifecycle)
- Crypto deposit unit tests
- Idempotency tests

Usage:
    python run_deposit_settlement_tests.py
    python run_deposit_settlement_tests.py --verbose
    python run_deposit_settlement_tests.py --coverage
"""
import subprocess
import sys
import os

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_tests():
    """Run deposit settlement related tests"""
    
    # Core deposit settlement test files
    test_files = [
        "tests/test_deposit_settlement.py",  # Settlement service tests
        "tests/test_deposit_monitor.py",     # Worker integration tests
        "tests/test_crypto_deposit_integration.py",  # Full lifecycle tests
        "tests/test_crypto_deposit_unit.py",  # Unit tests
    ]
    
    # Additional tests that might be relevant
    additional_tests = [
        "tests/test_idempotency.py",  # Idempotency tests
    ]
    
    print("=" * 70)
    print("Deposit Settlement Test Suite - Settlement & Ledger Correctness")
    print("=" * 70)
    print()
    
    all_passed = True
    results = {}
    
    # Run each test file
    for test_file in test_files + additional_tests:
        if not os.path.exists(test_file):
            print(f"[SKIP] Skipping {test_file} (file not found)")
            continue
            
        print(f"\n{'=' * 70}")
        print(f"Running: {test_file}")
        print(f"{'=' * 70}")
        
        try:
            # Run pytest for this test file
            result = subprocess.run(
                [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                cwd=os.path.dirname(os.path.abspath(__file__)) or "."
            )
            
            # Print output
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
            
            # Check result
            if result.returncode == 0:
                print(f"[PASS] {test_file} - PASSED")
                results[test_file] = "PASSED"
            else:
                print(f"[FAIL] {test_file} - FAILED")
                results[test_file] = "FAILED"
                all_passed = False
                
        except Exception as e:
            print(f"[ERROR] Error running {test_file}: {e}")
            results[test_file] = "ERROR"
            all_passed = False
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    for test_file, status in results.items():
        status_icon = "[PASS]" if status == "PASSED" else "[FAIL]"
        print(f"{status_icon} {test_file}: {status}")
    
    print()
    if all_passed:
        print("[SUCCESS] All tests PASSED!")
        return 0
    else:
        print("[WARNING] Some tests FAILED. Please review the output above.")
        return 1


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)
