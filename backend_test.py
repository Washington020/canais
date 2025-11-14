#!/usr/bin/env python3
"""
LuxePass Backend Testing Suite
Testing critical endpoints for deployment readiness
Focus: Authentication, Plans, Appointments, Video Call Integration
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://gymvideos.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class TestResult:
    def __init__(self):
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.results = []
    
    def add_result(self, test_name: str, passed: bool, message: str, details: Dict = None):
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")

def test_integration_plans_endpoint():
    """Test the GET /api/integration/plans endpoint as requested in review"""
    test_result = TestResult()
    
    print("🎯 TESTING GET /api/integration/plans ENDPOINT")
    print("="*60)
    
    try:
        # Test 1: Basic endpoint connectivity
        print("\n1. Testing endpoint connectivity...")
        response = requests.get(f"{BACKEND_URL}/integration/plans", timeout=10)
        
        if response.status_code == 200:
            test_result.add_result(
                "Endpoint Connectivity", 
                True, 
                f"Status 200 OK - Endpoint accessible",
                {"status_code": response.status_code, "response_time": f"{response.elapsed.total_seconds():.2f}s"}
            )
        else:
            test_result.add_result(
                "Endpoint Connectivity", 
                False, 
                f"Status {response.status_code} - Expected 200",
                {"status_code": response.status_code, "response_text": response.text[:200]}
            )
            return test_result
        
        # Test 2: Response format validation
        print("\n2. Testing response format...")
        try:
            plans_data = response.json()
            if isinstance(plans_data, list):
                test_result.add_result(
                    "Response Format", 
                    True, 
                    f"Valid JSON array returned with {len(plans_data)} plans",
                    {"data_type": type(plans_data).__name__, "plan_count": len(plans_data)}
                )
            else:
                test_result.add_result(
                    "Response Format", 
                    False, 
                    f"Expected array, got {type(plans_data).__name__}",
                    {"actual_type": type(plans_data).__name__}
                )
                return test_result
        except json.JSONDecodeError as e:
            test_result.add_result(
                "Response Format", 
                False, 
                f"Invalid JSON response: {str(e)}",
                {"error": str(e)}
            )
            return test_result
        
        # Test 3: Expected plan count
        print("\n3. Testing plan count...")
        expected_plans = ["basico", "intermediario", "vip"]
        if len(plans_data) >= 3:
            test_result.add_result(
                "Plan Count", 
                True, 
                f"Found {len(plans_data)} plans (expected 3 or 4)",
                {"plan_count": len(plans_data), "expected": "3-4"}
            )
        else:
            test_result.add_result(
                "Plan Count", 
                False, 
                f"Found {len(plans_data)} plans, expected at least 3",
                {"plan_count": len(plans_data), "expected": "3-4"}
            )
        
        # Test 4: Plan structure validation
        print("\n4. Testing plan data structure...")
        required_fields = [
            "type", "name", "description", "features", "monthly_price", 
            "activation_fee", "first_month_total", "fidelity_months",
            "marketing_benefits", "nutritionist_consultations", "personal_consultations"
        ]
        
        structure_valid = True
        missing_fields = []
        
        for i, plan in enumerate(plans_data):
            plan_missing = []
            for field in required_fields:
                if field not in plan:
                    plan_missing.append(field)
                    structure_valid = False
            
            if plan_missing:
                missing_fields.append(f"Plan {i+1} ({plan.get('name', 'Unknown')}): {plan_missing}")
        
        if structure_valid:
            test_result.add_result(
                "Plan Structure", 
                True, 
                "All plans have required fields",
                {"required_fields": required_fields, "validated_plans": len(plans_data)}
            )
        else:
            test_result.add_result(
                "Plan Structure", 
                False, 
                "Missing required fields in some plans",
                {"missing_fields": missing_fields}
            )
        
        # Test 5: Specific plan validation (basico, intermediario, vip)
        print("\n5. Testing specific plan types...")
        found_plans = {plan.get("type"): plan for plan in plans_data}
        
        for expected_plan in expected_plans:
            if expected_plan in found_plans:
                plan = found_plans[expected_plan]
                test_result.add_result(
                    f"Plan {expected_plan.title()}", 
                    True, 
                    f"Found {plan.get('name')} with price R$ {plan.get('monthly_price', 0):.2f}",
                    {
                        "type": plan.get("type"),
                        "name": plan.get("name"),
                        "monthly_price": plan.get("monthly_price"),
                        "activation_fee": plan.get("activation_fee"),
                        "first_month_total": plan.get("first_month_total")
                    }
                )
            else:
                test_result.add_result(
                    f"Plan {expected_plan.title()}", 
                    False, 
                    f"Plan type '{expected_plan}' not found",
                    {"available_types": list(found_plans.keys())}
                )
        
        # Test 6: Price validation
        print("\n6. Testing price data...")
        price_valid = True
        price_issues = []
        
        for plan in plans_data:
            plan_name = plan.get("name", "Unknown")
            monthly_price = plan.get("monthly_price", 0)
            activation_fee = plan.get("activation_fee", 0)
            first_month_total = plan.get("first_month_total", 0)
            
            # Validate prices are numbers and positive
            if not isinstance(monthly_price, (int, float)) or monthly_price <= 0:
                price_issues.append(f"{plan_name}: Invalid monthly_price ({monthly_price})")
                price_valid = False
            
            if not isinstance(activation_fee, (int, float)) or activation_fee < 0:
                price_issues.append(f"{plan_name}: Invalid activation_fee ({activation_fee})")
                price_valid = False
            
            if not isinstance(first_month_total, (int, float)) or first_month_total <= 0:
                price_issues.append(f"{plan_name}: Invalid first_month_total ({first_month_total})")
                price_valid = False
            
            # Validate first month calculation (should be monthly + activation)
            expected_total = monthly_price + activation_fee
            if abs(first_month_total - expected_total) > 0.01:  # Allow small floating point differences
                price_issues.append(f"{plan_name}: first_month_total ({first_month_total}) != monthly_price + activation_fee ({expected_total})")
                price_valid = False
        
        if price_valid:
            test_result.add_result(
                "Price Validation", 
                True, 
                "All price fields are valid and calculations correct",
                {"validated_plans": len(plans_data)}
            )
        else:
            test_result.add_result(
                "Price Validation", 
                False, 
                "Price validation issues found",
                {"issues": price_issues}
            )
        
        # Test 7: Features and benefits validation
        print("\n7. Testing features and benefits...")
        features_valid = True
        features_issues = []
        
        for plan in plans_data:
            plan_name = plan.get("name", "Unknown")
            features = plan.get("features", [])
            marketing_benefits = plan.get("marketing_benefits", [])
            
            if not isinstance(features, list) or len(features) == 0:
                features_issues.append(f"{plan_name}: features should be non-empty array")
                features_valid = False
            
            if not isinstance(marketing_benefits, list):
                features_issues.append(f"{plan_name}: marketing_benefits should be array")
                features_valid = False
        
        if features_valid:
            test_result.add_result(
                "Features Validation", 
                True, 
                "All plans have valid features and marketing benefits",
                {"validated_plans": len(plans_data)}
            )
        else:
            test_result.add_result(
                "Features Validation", 
                False, 
                "Features validation issues found",
                {"issues": features_issues}
            )
        
        # Test 8: Consultation fields validation
        print("\n8. Testing consultation fields...")
        consultation_valid = True
        consultation_issues = []
        
        for plan in plans_data:
            plan_name = plan.get("name", "Unknown")
            nutritionist_consultations = plan.get("nutritionist_consultations", 0)
            personal_consultations = plan.get("personal_consultations", 0)
            
            if not isinstance(nutritionist_consultations, int) or nutritionist_consultations < 0:
                consultation_issues.append(f"{plan_name}: Invalid nutritionist_consultations ({nutritionist_consultations})")
                consultation_valid = False
            
            if not isinstance(personal_consultations, int) or personal_consultations < 0:
                consultation_issues.append(f"{plan_name}: Invalid personal_consultations ({personal_consultations})")
                consultation_valid = False
        
        if consultation_valid:
            test_result.add_result(
                "Consultation Fields", 
                True, 
                "All consultation fields are valid",
                {"validated_plans": len(plans_data)}
            )
        else:
            test_result.add_result(
                "Consultation Fields", 
                False, 
                "Consultation field validation issues found",
                {"issues": consultation_issues}
            )
        
        # Test 9: Frontend compatibility test
        print("\n9. Testing frontend compatibility...")
        frontend_compatible = True
        compatibility_issues = []
        
        # Check if the response matches what the frontend expects
        for plan in plans_data:
            # Check if all fields used by frontend are present
            frontend_fields = ["type", "name", "description", "monthly_price", "activation_fee", 
                             "first_month_total", "features", "marketing_benefits"]
            
            for field in frontend_fields:
                if field not in plan:
                    compatibility_issues.append(f"Missing frontend field '{field}' in plan {plan.get('name', 'Unknown')}")
                    frontend_compatible = False
        
        if frontend_compatible:
            test_result.add_result(
                "Frontend Compatibility", 
                True, 
                "Response format matches frontend expectations",
                {"frontend_fields_validated": len(frontend_fields)}
            )
        else:
            test_result.add_result(
                "Frontend Compatibility", 
                False, 
                "Frontend compatibility issues found",
                {"issues": compatibility_issues}
            )
        
        # Test 10: Sample plan data display
        print("\n10. Displaying sample plan data...")
        if plans_data:
            sample_plan = plans_data[0]
            test_result.add_result(
                "Sample Plan Data", 
                True, 
                f"Sample plan: {sample_plan.get('name')} - R$ {sample_plan.get('monthly_price', 0):.2f}/mês",
                {
                    "sample_plan": {
                        "type": sample_plan.get("type"),
                        "name": sample_plan.get("name"),
                        "description": sample_plan.get("description"),
                        "monthly_price": sample_plan.get("monthly_price"),
                        "activation_fee": sample_plan.get("activation_fee"),
                        "first_month_total": sample_plan.get("first_month_total"),
                        "features_count": len(sample_plan.get("features", [])),
                        "marketing_benefits_count": len(sample_plan.get("marketing_benefits", [])),
                        "nutritionist_consultations": sample_plan.get("nutritionist_consultations"),
                        "personal_consultations": sample_plan.get("personal_consultations")
                    }
                }
            )
        
    except requests.exceptions.RequestException as e:
        test_result.add_result(
            "Network Connection", 
            False, 
            f"Failed to connect to API: {str(e)}",
            {"error": str(e), "url": f"{BACKEND_URL}/integration/plans"}
        )
    except Exception as e:
        test_result.add_result(
            "Unexpected Error", 
            False, 
            f"Unexpected error during testing: {str(e)}",
            {"error": str(e)}
        )
    
    return test_result

def main():
    """Main test execution"""
    print("🚀 LUXEPASS BACKEND API TESTING")
    print("Testing GET /api/integration/plans endpoint")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Run the integration plans test
    result = test_integration_plans_endpoint()
    
    # Print summary
    result.print_summary()
    
    # Return appropriate exit code
    if result.failed_tests > 0:
        print(f"\n❌ TESTING COMPLETED WITH {result.failed_tests} FAILURES")
        return 1
    else:
        print(f"\n✅ ALL TESTS PASSED SUCCESSFULLY!")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)