#!/usr/bin/env python3
"""
LuxePass Gym Management System Backend Testing
Enhanced testing for comprehensive client data, revenue reports, and contract management
"""

import requests
import json
import base64
from datetime import datetime, timezone
import sys
import os

# Configuration
BACKEND_URL = "https://trainer-client-app-4.preview.emergentagent.com/api"

class LuxePassTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.gym_token = None
        self.gym_id = None
        self.client_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_gym_authentication(self):
        """Test 1: Gym Authentication with academia_teste/teste123"""
        print("\n🔐 Testing Gym Authentication...")
        
        try:
            response = self.session.post(
                f"{self.backend_url}/gym/auth",
                json={
                    "login": "academia_teste",
                    "password": "teste123"
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.gym_token = data.get("access_token")
                self.gym_id = data.get("gym_info", {}).get("id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.gym_token}"
                })
                
                self.log_test(
                    "Gym Authentication",
                    True,
                    f"Successfully authenticated gym: {data.get('gym_info', {}).get('name')}",
                    {
                        "gym_id": self.gym_id,
                        "gym_name": data.get('gym_info', {}).get('name'),
                        "token_received": bool(self.gym_token)
                    }
                )
                return True
            else:
                self.log_test(
                    "Gym Authentication",
                    False,
                    f"Authentication failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Gym Authentication",
                False,
                f"Exception during authentication: {str(e)}"
            )
            return False
    
    def test_client_login_and_token_generation(self):
        """Test 2: Client login and token generation for VIP user"""
        print("\n👤 Testing Client Login and Token Generation...")
        
        try:
            # Login as VIP client
            response = self.session.post(
                f"{self.backend_url}/auth/login",
                json={
                    "email": "vip@luxepass.com",
                    "password": "vip123"
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                client_token = data.get("access_token")
                
                # Generate a token for the VIP client using simple endpoint
                token_response = self.session.post(
                    f"{self.backend_url}/tokens/generate-simple",
                    headers={
                        "Authorization": f"Bearer {client_token}",
                        "Content-Type": "application/json"
                    },
                    params={
                        "token_type": "gym",
                        "validity_hours": 3
                    }
                )
                
                if token_response.status_code == 200:
                    token_data = token_response.json()
                    self.client_token_code = token_data.get("token_code")
                    
                    self.log_test(
                        "VIP Client Token Generation",
                        True,
                        f"Successfully generated token: {self.client_token_code[:8]}...",
                        {
                            "token_code": self.client_token_code,
                            "expires_at": token_data.get("expires_at"),
                            "security_score": token_data.get("security_score")
                        }
                    )
                    return True
                else:
                    self.log_test(
                        "VIP Client Token Generation",
                        False,
                        f"Token generation failed: {token_response.status_code}",
                        {"response": token_response.text}
                    )
                    return False
            else:
                self.log_test(
                    "VIP Client Login",
                    False,
                    f"Client login failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Client Login and Token Generation",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    def test_enhanced_token_validation(self):
        """Test 3: Enhanced Token Validation with complete client data"""
        print("\n🎫 Testing Enhanced Token Validation...")
        
        if not hasattr(self, 'client_token_code') or not self.client_token_code:
            self.log_test(
                "Enhanced Token Validation",
                False,
                "No client token available for validation"
            )
            return False
        
        try:
            response = self.session.post(
                f"{self.backend_url}/tokens/validate/{self.client_token_code}",
                params={"gym_id": self.gym_id},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                user_data = data.get("user", {})
                
                # Check for enhanced response fields
                required_fields = [
                    "full_name", "email", "phone", "cpf", "date_of_birth",
                    "profile_photo", "address", "emergency_contact", 
                    "medical_conditions", "member_since", "tokens_used_today"
                ]
                
                missing_fields = [field for field in required_fields if field not in user_data]
                
                self.log_test(
                    "Enhanced Token Validation",
                    len(missing_fields) == 0,
                    f"Token validated with {'complete' if not missing_fields else 'incomplete'} client data",
                    {
                        "user_name": user_data.get("full_name"),
                        "user_email": user_data.get("email"),
                        "plan_type": user_data.get("plan_type"),
                        "member_since": user_data.get("member_since"),
                        "tokens_used": user_data.get("tokens_used_today"),
                        "missing_fields": missing_fields,
                        "validation_id": data.get("validation_id")
                    }
                )
                return len(missing_fields) == 0
            else:
                self.log_test(
                    "Enhanced Token Validation",
                    False,
                    f"Token validation failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Enhanced Token Validation",
                False,
                f"Exception during token validation: {str(e)}"
            )
            return False
    
    def test_clients_report(self):
        """Test 4: Clients Report Test"""
        print("\n📊 Testing Clients Report...")
        
        if not self.gym_id:
            self.log_test(
                "Clients Report",
                False,
                "No gym_id available for clients report"
            )
            return False
        
        try:
            response = self.session.get(
                f"{self.backend_url}/gym/{self.gym_id}/clients-report",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                clients = data.get("clients", [])
                total_clients = data.get("total_clients", 0)
                
                # Check if clients have required information
                client_fields_check = True
                if clients:
                    sample_client = clients[0]
                    required_client_fields = [
                        "full_name", "email", "plan_type", "total_visits", 
                        "first_visit", "member_since"
                    ]
                    missing_client_fields = [
                        field for field in required_client_fields 
                        if field not in sample_client
                    ]
                    client_fields_check = len(missing_client_fields) == 0
                
                self.log_test(
                    "Clients Report",
                    True,
                    f"Retrieved clients report with {total_clients} clients",
                    {
                        "total_clients": total_clients,
                        "gym_id": data.get("gym_id"),
                        "generated_at": data.get("generated_at"),
                        "client_data_complete": client_fields_check,
                        "sample_client": clients[0] if clients else None
                    }
                )
                return True
            else:
                self.log_test(
                    "Clients Report",
                    False,
                    f"Clients report failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Clients Report",
                False,
                f"Exception during clients report: {str(e)}"
            )
            return False
    
    def test_revenue_report(self):
        """Test 5: Revenue Report Test"""
        print("\n💰 Testing Revenue Report...")
        
        if not self.gym_id:
            self.log_test(
                "Revenue Report",
                False,
                "No gym_id available for revenue report"
            )
            return False
        
        try:
            response = self.session.get(
                f"{self.backend_url}/gym/{self.gym_id}/revenue-report",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required revenue report fields
                required_fields = [
                    "check_in_value", "monthly_stats", "total_stats", 
                    "last_30_days", "contract_status"
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                monthly_stats = data.get("monthly_stats", {})
                total_stats = data.get("total_stats", {})
                
                self.log_test(
                    "Revenue Report",
                    len(missing_fields) == 0,
                    f"Revenue report generated with {data.get('contract_status', 'unknown')} contract",
                    {
                        "check_in_value": data.get("check_in_value"),
                        "monthly_checkins": monthly_stats.get("checkins"),
                        "monthly_revenue": monthly_stats.get("revenue"),
                        "total_checkins": total_stats.get("checkins"),
                        "total_revenue": total_stats.get("revenue"),
                        "contract_status": data.get("contract_status"),
                        "missing_fields": missing_fields
                    }
                )
                return len(missing_fields) == 0
            else:
                self.log_test(
                    "Revenue Report",
                    False,
                    f"Revenue report failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Revenue Report",
                False,
                f"Exception during revenue report: {str(e)}"
            )
            return False
    
    def test_contract_management(self):
        """Test 6: Contract Management Test"""
        print("\n📋 Testing Contract Management...")
        
        if not self.gym_id:
            self.log_test(
                "Contract Management",
                False,
                "No gym_id available for contract management"
            )
            return False
        
        try:
            # Step 1: Get initial contract (should return no contract)
            response = self.session.get(
                f"{self.backend_url}/gym/{self.gym_id}/contract",
                headers={"Content-Type": "application/json"}
            )
            
            initial_contract_exists = False
            if response.status_code == 200:
                data = response.json()
                initial_contract_exists = data.get("contract_exists", False)
                
                self.log_test(
                    "Get Initial Contract",
                    True,
                    f"Contract status: {'exists' if initial_contract_exists else 'not configured'}",
                    {
                        "contract_exists": initial_contract_exists,
                        "status": data.get("status"),
                        "check_in_value": data.get("check_in_value")
                    }
                )
            
            # Step 2: Set contract value (R$ 15.00 per check-in)
            set_value_response = self.session.put(
                f"{self.backend_url}/gym/{self.gym_id}/contract/value",
                params={"check_in_value": 15.00},
                headers={"Content-Type": "application/json"}
            )
            
            value_set_success = False
            if set_value_response.status_code == 200:
                value_data = set_value_response.json()
                value_set_success = value_data.get("success", False)
                
                self.log_test(
                    "Set Contract Value",
                    value_set_success,
                    f"Contract value set to R$ {value_data.get('check_in_value', 0):.2f}",
                    {
                        "success": value_set_success,
                        "check_in_value": value_data.get("check_in_value"),
                        "message": value_data.get("message")
                    }
                )
            else:
                self.log_test(
                    "Set Contract Value",
                    False,
                    f"Failed to set contract value: {set_value_response.status_code}",
                    {"response": set_value_response.text}
                )
            
            # Step 3: Verify contract value was saved
            verify_response = self.session.get(
                f"{self.backend_url}/gym/{self.gym_id}/contract",
                headers={"Content-Type": "application/json"}
            )
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                saved_value = verify_data.get("check_in_value", 0)
                contract_exists = verify_data.get("contract_exists", False)
                
                self.log_test(
                    "Verify Contract Value",
                    contract_exists and saved_value == 15.00,
                    f"Contract value verified: R$ {saved_value:.2f}",
                    {
                        "contract_exists": contract_exists,
                        "check_in_value": saved_value,
                        "status": verify_data.get("status")
                    }
                )
                return contract_exists and saved_value == 15.00
            else:
                self.log_test(
                    "Verify Contract Value",
                    False,
                    f"Failed to verify contract: {verify_response.status_code}",
                    {"response": verify_response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Contract Management",
                False,
                f"Exception during contract management: {str(e)}"
            )
            return False
    
    def test_contract_document(self):
        """Test 7: Contract Document Test"""
        print("\n📄 Testing Contract Document Upload...")
        
        if not self.gym_id:
            self.log_test(
                "Contract Document",
                False,
                "No gym_id available for contract document test"
            )
            return False
        
        try:
            # Create a mock base64 document (simulating PDF upload)
            mock_document = base64.b64encode(b"Mock contract document content for testing").decode('utf-8')
            
            response = self.session.post(
                f"{self.backend_url}/gym/{self.gym_id}/contract/document",
                params={"contract_document": mock_document},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                
                # Verify contract status changed to "signed"
                verify_response = self.session.get(
                    f"{self.backend_url}/gym/{self.gym_id}/contract",
                    headers={"Content-Type": "application/json"}
                )
                
                contract_signed = False
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    contract_signed = verify_data.get("status") == "signed"
                
                self.log_test(
                    "Contract Document Upload",
                    success and contract_signed,
                    f"Contract document uploaded and status: {'signed' if contract_signed else 'not signed'}",
                    {
                        "upload_success": success,
                        "contract_signed": contract_signed,
                        "signed_at": data.get("signed_at"),
                        "message": data.get("message")
                    }
                )
                return success and contract_signed
            else:
                self.log_test(
                    "Contract Document Upload",
                    False,
                    f"Document upload failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Contract Document Upload",
                False,
                f"Exception during document upload: {str(e)}"
            )
            return False
    
    def test_updated_revenue_report(self):
        """Test 8: Retry Revenue Report with Updated Calculations"""
        print("\n💰 Testing Updated Revenue Report with Contract Value...")
        
        if not self.gym_id:
            self.log_test(
                "Updated Revenue Report",
                False,
                "No gym_id available for updated revenue report"
            )
            return False
        
        try:
            response = self.session.get(
                f"{self.backend_url}/gym/{self.gym_id}/revenue-report",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                check_in_value = data.get("check_in_value", 0)
                monthly_stats = data.get("monthly_stats", {})
                total_stats = data.get("total_stats", {})
                
                # Verify calculations
                monthly_checkins = monthly_stats.get("checkins", 0)
                monthly_revenue = monthly_stats.get("revenue", 0)
                expected_monthly_revenue = monthly_checkins * check_in_value
                
                total_checkins = total_stats.get("checkins", 0)
                total_revenue = total_stats.get("revenue", 0)
                expected_total_revenue = total_checkins * check_in_value
                
                calculations_correct = (
                    abs(monthly_revenue - expected_monthly_revenue) < 0.01 and
                    abs(total_revenue - expected_total_revenue) < 0.01
                )
                
                self.log_test(
                    "Updated Revenue Report",
                    calculations_correct,
                    f"Revenue calculations {'correct' if calculations_correct else 'incorrect'} with R$ {check_in_value:.2f} per check-in",
                    {
                        "check_in_value": check_in_value,
                        "monthly_checkins": monthly_checkins,
                        "monthly_revenue": monthly_revenue,
                        "expected_monthly": expected_monthly_revenue,
                        "total_checkins": total_checkins,
                        "total_revenue": total_revenue,
                        "expected_total": expected_total_revenue,
                        "calculations_match": calculations_correct
                    }
                )
                return calculations_correct
            else:
                self.log_test(
                    "Updated Revenue Report",
                    False,
                    f"Updated revenue report failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Updated Revenue Report",
                False,
                f"Exception during updated revenue report: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting LuxePass Gym Management System Testing")
        print(f"Backend URL: {self.backend_url}")
        print("=" * 80)
        
        tests = [
            self.test_gym_authentication,
            self.test_client_login_and_token_generation,
            self.test_enhanced_token_validation,
            self.test_clients_report,
            self.test_revenue_report,
            self.test_contract_management,
            self.test_contract_document,
            self.test_updated_revenue_report
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test.__name__}: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 TEST SUMMARY")
        print("=" * 80)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details'] and result['status'] == "❌ FAIL":
                print(f"   Error: {result['message']}")
        
        print(f"\n📊 OVERALL RESULTS: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! LuxePass Gym Management System is fully operational.")
        else:
            print(f"⚠️  {total - passed} test(s) failed. Review the issues above.")
        
        return passed == total

def main():
    """Main test execution"""
    tester = LuxePassTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()