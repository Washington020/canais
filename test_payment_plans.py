#!/usr/bin/env python3
"""
Payment Plans Pricing Test Script
Tests the updated payment plans pricing as requested in review
"""

import sys
import os
sys.path.append('/app')

from backend_test import FitPassTester

def main():
    """Run payment plans pricing tests"""
    tester = FitPassTester()
    
    print("🚀 Starting LuxePass Payment Plans Pricing Tests")
    print(f"Testing against: https://luxecoach.preview.emergentagent.com/api")
    print("Testing the updated payment plans pricing that was just changed...")
    
    # Run the payment plans tests
    plans_test_passed = tester.test_payment_plans_pricing()
    user_integration_passed = tester.test_user_profile_integration()
    
    # Summary
    print("\n" + "="*70)
    print("📊 PAYMENT PLANS PRICING TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for result in tester.test_results if result["success"])
    total = len(tester.test_results)
    
    print(f"Total Payment Plans Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    # Show failed tests
    failed_tests = [result for result in tester.test_results if not result["success"]]
    if failed_tests:
        print("\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test['test']}: {test['details']}")
    else:
        print("\n✅ All payment plans pricing tests passed!")
        print("VERIFIED PRICING UPDATES:")
        print("  ✓ Basic plan: R$ 79.80 (updated from R$ 29.90)")
        print("  ✓ Intermediário plan: R$ 49.90 (newly added)")
        print("  ✓ Premium plan: R$ 59.90 (unchanged)")
        print("  ✓ VIP plan: R$ 99.90 (unchanged)")
        print("\nVERIFIED PLAN STRUCTURE:")
        print("  ✓ All plans have correct structure (id, name, price, currency, duration_days, features, token_limit, description)")
        print("  ✓ Basic: 10 tokens, Intermediário: 30 tokens, Premium: 60 tokens, VIP: unlimited (-1)")
        print("  ✓ All plans use BRL currency and 30-day duration")
        print("  ✓ User profile integration working for different plan types")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)