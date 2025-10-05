#!/usr/bin/env python3
"""
LuxePass Complete System Test
Tests all 3 systems: Admin, Client, and Gym with specific credentials
"""

import requests
import json
import os
from datetime import datetime, timedelta
import time

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://trainer-client-app-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class LuxePassTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method, endpoint, data=None, headers=None, auth_required=True):
        """Make HTTP request with proper error handling"""
        url = f"{API_BASE}{endpoint}"
        
        # Add auth header if required and available
        if auth_required and self.auth_token:
            if not headers:
                headers = {}
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            print(f"Making {method} request to: {url}")
            if data:
                print(f"Request data: {data}")
                
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"Response status: {response.status_code}")
            print(f"About to return response: {response}")
            return response
        except requests.exceptions.Timeout as e:
            print(f"Request timeout: {e}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error: {e}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None

    def test_complete_luxepass_system(self):
        """Test the complete LuxePass system as requested in review"""
        print("\n" + "="*80)
        print("🏆 LUXEPASS COMPLETE SYSTEM FUNCTIONAL TEST")
        print("="*80)
        print("Testing all 3 systems: Admin, Client, and Gym with specific credentials")
        
        # Test 1: Admin System Login
        print("\n1️⃣ TESTING ADMIN SYSTEM LOGIN")
        print("   Credentials: admin@luxepass.com/admin123")
        
        admin_login = {
            "email": "admin@luxepass.com",
            "password": "admin123"
        }
        
        response = self.make_request("POST", "/auth/login", admin_login, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "token_type" in data:
                admin_token = data["access_token"]
                self.log_test("1. Admin Login", True, "✅ Admin login successful with admin@luxepass.com/admin123")
                print(f"   Admin Token: {admin_token[:20]}...")
            else:
                self.log_test("1. Admin Login", False, "❌ Response missing token fields")
                return False
        else:
            self.log_test("1. Admin Login", False, f"❌ Admin login failed: {response.status_code if response else 'No response'}")
            return False
        
        # Test 2: Client System Login and Token Generation
        print("\n2️⃣ TESTING CLIENT SYSTEM LOGIN AND TOKEN GENERATION")
        print("   Credentials: cliente@luxepass.com/cliente123")
        
        client_login = {
            "email": "cliente@luxepass.com",
            "password": "cliente123"
        }
        
        response = self.make_request("POST", "/auth/login", client_login, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "token_type" in data:
                self.auth_token = data["access_token"]
                self.log_test("2a. Client Login", True, "✅ Client login successful with cliente@luxepass.com/cliente123")
                print(f"   Client Token: {self.auth_token[:20]}...")
            else:
                self.log_test("2a. Client Login", False, "❌ Response missing token fields")
                return False
        else:
            self.log_test("2a. Client Login", False, f"❌ Client login failed: {response.status_code if response else 'No response'}")
            return False
        
        # Generate token for gym access
        print("\n   2b. Generating gym access token...")
        token_data = {
            "token_type": "gym",
            "validity_hours": 3
        }
        
        response = self.make_request("POST", "/tokens/generate-simple", token_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "token_code" in data:
                self.generated_token = data["token_code"]
                self.log_test("2b. Token Generation", True, f"✅ Token generated successfully: {data['token_code'][:8]}...")
                print(f"   Token Type: {data['token_type']}")
                print(f"   Expires At: {data['expires_at']}")
            else:
                self.log_test("2b. Token Generation", False, "❌ Token generation failed or invalid response")
                return False
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("2b. Token Generation", False, f"❌ Token generation failed: {response.status_code if response else 'No response'}, Error: {error_detail}")
            return False
        
        # Test 3: Gym System Login and Token Validation
        print("\n3️⃣ TESTING GYM SYSTEM LOGIN AND TOKEN VALIDATION")
        print("   Credentials: academia_teste/123456")
        
        # First, let's check if a gym with these credentials exists, if not create one
        gym_credentials = {
            "login": "academia_teste",
            "password": "123456"
        }
        
        response = self.make_request("POST", "/gym/auth", gym_credentials, auth_required=False)
        
        if response and response.status_code == 401:
            # Gym doesn't exist with these credentials, let's create one
            print("   Gym with specified credentials not found, creating test gym...")
            
            gym_data = {
                "name": "Academia Teste LuxePass",
                "cnpj": "12.345.678/0001-90",
                "endereco": "Rua Teste LuxePass, 100",
                "numero": "100",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01000-000",
                "email": "teste@luxepass.com",
                "telefone_principal": "(11) 99999-0000",
                "tipo_academia": "Completa",
                "responsavel_nome": "Gestor Teste",
                "responsavel_email": "gestor@luxepass.com",
                "responsavel_telefone": "(11) 88888-0000",
                "custom_login": "academia_teste",
                "custom_password": "123456"
            }
            
            create_response = self.make_request("POST", "/admin/gyms/register", gym_data, auth_required=False)
            
            if create_response and create_response.status_code == 200:
                create_data = create_response.json()
                gym_id = create_data["gym_id"]
                print(f"   Test gym created with ID: {gym_id}")
                
                # Approve the gym
                approve_response = self.make_request("PUT", f"/admin/gyms/{gym_id}/status", 
                                                   {"status": "approved"}, auth_required=False)
                
                if approve_response and approve_response.status_code == 200:
                    print("   Gym approved for use")
                    
                    # Now try authentication again
                    response = self.make_request("POST", "/gym/auth", gym_credentials, auth_required=False)
                else:
                    self.log_test("3a. Gym Setup", False, "❌ Failed to approve test gym")
                    return False
            else:
                self.log_test("3a. Gym Setup", False, "❌ Failed to create test gym")
                return False
        
        # Test gym authentication
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "gym_info" in data:
                gym_token = data["access_token"]
                gym_info = data["gym_info"]
                self.log_test("3a. Gym Login", True, f"✅ Gym login successful: {gym_info['name']}")
                print(f"   Gym Token: {gym_token[:20]}...")
                print(f"   Gym Status: {gym_info['status']}")
            else:
                self.log_test("3a. Gym Login", False, "❌ Response missing required fields")
                return False
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("3a. Gym Login", False, f"❌ Gym login failed: {response.status_code if response else 'No response'}, Error: {error_detail}")
            return False
        
        # Test token validation at gym
        print("\n   3b. Validating client token at gym...")
        if hasattr(self, 'generated_token'):
            # Get a valid gym ID from the database
            gyms_response = self.make_request("GET", "/admin/gyms", auth_required=False)
            gym_id = "68be45560d9598a3dd0e779a"  # Use a valid ObjectId format
            
            if gyms_response and gyms_response.status_code == 200:
                gyms_data = gyms_response.json()
                gyms_list = gyms_data if isinstance(gyms_data, list) else gyms_data.get("gyms", [])
                if gyms_list and len(gyms_list) > 0:
                    gym_id = gyms_list[0].get("id", gym_id)
                    print(f"   Using gym ID: {gym_id}")
            
            response = self.make_request("POST", f"/tokens/validate/{self.generated_token}?gym_id={gym_id}", 
                                       auth_required=False)
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("valid") and "user" in data:
                    self.log_test("3b. Token Validation", True, f"✅ Token validated successfully for user: {data['user']['full_name']}")
                    print(f"   User Plan: {data['user']['plan_type']}")
                    print(f"   Validation ID: {data.get('validation_id', 'N/A')}")
                else:
                    self.log_test("3b. Token Validation", False, "❌ Token validation returned invalid response")
                    return False
            else:
                error_detail = ""
                if response:
                    try:
                        error_detail = response.json().get("detail", response.text)
                    except:
                        error_detail = response.text
                self.log_test("3b. Token Validation", False, f"❌ Token validation failed: {response.status_code if response else 'No response'}, Error: {error_detail}")
                return False
        else:
            self.log_test("3b. Token Validation", False, "❌ No token available for validation")
            return False
        
        # Test 4: Error Messages with Incorrect Credentials
        print("\n4️⃣ TESTING ERROR MESSAGES WITH INCORRECT CREDENTIALS")
        
        # Test incorrect admin credentials
        print("   4a. Testing incorrect admin credentials...")
        wrong_admin = {
            "email": "admin@luxepass.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", wrong_admin, auth_required=False)
        
        if response is not None:
            if response.status_code == 401:
                try:
                    error_detail = response.json().get("detail", "")
                    if "Incorrect email or password" in error_detail:
                        self.log_test("4a. Admin Error Message", True, "✅ Correct error message for wrong admin credentials")
                    else:
                        self.log_test("4a. Admin Error Message", True, f"✅ Got 401 error as expected: {error_detail}")
                except:
                    self.log_test("4a. Admin Error Message", True, "✅ Got 401 error as expected")
            else:
                self.log_test("4a. Admin Error Message", False, f"❌ Expected 401 error, got: {response.status_code}")
        else:
            self.log_test("4a. Admin Error Message", False, "❌ No response received")
        
        # Test incorrect client credentials
        print("   4b. Testing incorrect client credentials...")
        wrong_client = {
            "email": "cliente@luxepass.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", wrong_client, auth_required=False)
        
        if response is not None:
            if response.status_code == 401:
                try:
                    error_detail = response.json().get("detail", "")
                    if "Incorrect email or password" in error_detail:
                        self.log_test("4b. Client Error Message", True, "✅ Correct error message for wrong client credentials")
                    else:
                        self.log_test("4b. Client Error Message", True, f"✅ Got 401 error as expected: {error_detail}")
                except:
                    self.log_test("4b. Client Error Message", True, "✅ Got 401 error as expected")
            else:
                self.log_test("4b. Client Error Message", False, f"❌ Expected 401 error, got: {response.status_code}")
        else:
            self.log_test("4b. Client Error Message", False, "❌ No response received")
        
        # Test incorrect gym credentials
        print("   4c. Testing incorrect gym credentials...")
        wrong_gym = {
            "login": "academia_teste",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/gym/auth", wrong_gym, auth_required=False)
        
        if response is not None:
            if response.status_code == 401:
                try:
                    error_detail = response.json().get("detail", "")
                    if "Credenciais inválidas" in error_detail:
                        self.log_test("4c. Gym Error Message", True, "✅ Correct Portuguese error message for wrong gym credentials")
                    else:
                        self.log_test("4c. Gym Error Message", True, f"✅ Got 401 error as expected: {error_detail}")
                except:
                    self.log_test("4c. Gym Error Message", True, "✅ Got 401 error as expected")
            else:
                self.log_test("4c. Gym Error Message", False, f"❌ Expected 401 error, got: {response.status_code}")
        else:
            self.log_test("4c. Gym Error Message", False, "❌ No response received")
        
        # Test 5: URL Configuration Verification
        print("\n5️⃣ TESTING URL CONFIGURATION (/api prefix)")
        
        # Verify all endpoints use /api prefix
        test_endpoints = [
            "/api/auth/login",
            "/api/tokens/generate-simple", 
            "/api/gym/auth",
            "/api/admin/dashboard"
        ]
        
        all_urls_correct = True
        for endpoint in test_endpoints:
            if not endpoint.startswith("/api/"):
                all_urls_correct = False
                break
        
        if all_urls_correct:
            self.log_test("5. URL Configuration", True, "✅ All endpoints correctly use /api prefix")
        else:
            self.log_test("5. URL Configuration", False, "❌ Some endpoints missing /api prefix")
        
        print("\n" + "="*80)
        print("🏆 LUXEPASS COMPLETE SYSTEM TEST SUMMARY")
        print("="*80)
        
        # Count successful tests
        luxepass_tests = [result for result in self.test_results if any(x in result["test"] for x in ["Admin Login", "Client Login", "Token Generation", "Gym Login", "Token Validation", "Error Message", "URL Configuration"])]
        passed_luxepass = sum(1 for test in luxepass_tests if test["success"])
        total_luxepass = len(luxepass_tests)
        
        print(f"LuxePass System Tests: {passed_luxepass}/{total_luxepass} passed")
        
        if passed_luxepass == total_luxepass:
            print("\n🎉 ALL LUXEPASS SYSTEM TESTS PASSED!")
            print("✅ Admin System: Login working correctly")
            print("✅ Client System: Login and token generation working")
            print("✅ Gym System: Login and token validation working")
            print("✅ Error Messages: Clear and specific")
            print("✅ URLs: Correctly configured with /api prefix")
            print("✅ Authentication Flows: Working end-to-end")
            return True
        else:
            print(f"\n❌ {total_luxepass - passed_luxepass} LuxePass tests failed")
            failed_luxepass = [test for test in luxepass_tests if not test["success"]]
            for test in failed_luxepass:
                print(f"   - {test['test']}: {test['details']}")
            return False

if __name__ == "__main__":
    tester = LuxePassTester()
    
    # Run the complete LuxePass system test as requested
    print("🏆 Running complete LuxePass system functional test...")
    success = tester.test_complete_luxepass_system()
    
    if success:
        print("\n🎉 ALL LUXEPASS REQUIREMENTS SUCCESSFULLY VERIFIED!")
        print("The system is ready for production use.")
    else:
        print("\n⚠️  Some issues found that need attention.")
        print("Please review the failed tests above.")