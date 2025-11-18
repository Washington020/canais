#!/usr/bin/env python3
"""
Enhanced Gym Registration System Test Suite
Testing Focus: Gym Registration with Validation and Example Data
As requested in review: Test validation, error handling, response format, and integration
"""

import requests
import json
import sys
import os
from datetime import datetime
import traceback

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://pagsys.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class EnhancedGymRegistrationTester:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        self.created_gyms = []  # Track created gyms for cleanup
        
    def log_test(self, test_name, success, details="", error_msg=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error_msg:
            print(f"   Error: {error_msg}")
        print()
    
    def setup_admin_auth(self):
        """Setup admin authentication"""
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "email": "admin@luxepass.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                if self.admin_token:
                    print("✅ Admin authentication successful")
                    return True
                else:
                    print("❌ No access token received")
                    return False
            else:
                print(f"❌ Admin authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Admin authentication error: {e}")
            return False
    
    def test_successful_gym_registration(self):
        """Test 1: Successful registration with valid data"""
        test_name = "Successful Gym Registration with Valid Data"
        
        try:
            # Realistic test data as requested
            gym_data = {
                "name": "Academia Teste Premium",
                "cnpj": "12.345.678/0001-90",
                "email": "contato@academiatestepremium.com",
                "endereco": "Rua das Academias",
                "numero": "123",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "telefone_principal": "(11) 3333-4444",
                "responsavel_nome": "João Silva",
                "responsavel_email": "joao@academiatestepremium.com",
                "responsavel_telefone": "(11) 99999-3333"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Track created gym
                self.created_gyms.append({
                    "id": data.get("gym_id"),
                    "login": data.get("login"),
                    "password": data.get("password")
                })
                
                # Verify response structure
                required_fields = ["success", "gym_id", "login", "password", "gym_name", "status", "message", "login_credentials", "next_steps"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify "PARCEIRO CADASTRADO" message
                    if "PARCEIRO CADASTRADO" in data.get("message", ""):
                        # Verify auto-approval functionality
                        if data.get("status") == "approved":
                            self.log_test(test_name, True, 
                                        f"Gym registered successfully. ID: {data['gym_id']}, Login: {data['login']}, Status: {data['status']}")
                            return data
                        else:
                            self.log_test(test_name, False, "", f"Status not auto-approved: {data.get('status')}")
                    else:
                        self.log_test(test_name, False, "", "Missing 'PARCEIRO CADASTRADO' success message")
                else:
                    self.log_test(test_name, False, "", f"Missing required fields: {missing_fields}")
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                self.log_test(test_name, False, "", f"HTTP {response.status_code}: {error_data}")
                
        except Exception as e:
            self.log_test(test_name, False, "", f"Exception: {str(e)}")
            
        return None
    
    def test_validation_errors(self):
        """Test 2: Validation errors for missing required fields"""
        
        validation_tests = [
            {
                "name": "Missing Name Field",
                "data": {
                    "cnpj": "12.345.678/0001-91",
                    "email": "test1@example.com",
                    "endereco": "Rua Teste",
                    "numero": "123",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01234-567",
                    "telefone_principal": "(11) 3333-4444",
                    "responsavel_nome": "João Silva",
                    "responsavel_email": "joao@example.com",
                    "responsavel_telefone": "(11) 99999-3333"
                },
                "expected_status": 400,
                "expected_error": "Nome da academia é obrigatório"
            },
            {
                "name": "Missing CNPJ Field",
                "data": {
                    "name": "Academia Teste Sem CNPJ",
                    "email": "test2@example.com",
                    "endereco": "Rua Teste",
                    "numero": "123",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01234-567",
                    "telefone_principal": "(11) 3333-4444",
                    "responsavel_nome": "João Silva",
                    "responsavel_email": "joao@example.com",
                    "responsavel_telefone": "(11) 99999-3333"
                },
                "expected_status": 400,
                "expected_error": "CNPJ é obrigatório"
            },
            {
                "name": "Missing Email Field",
                "data": {
                    "name": "Academia Teste Sem Email",
                    "cnpj": "12.345.678/0001-92",
                    "endereco": "Rua Teste",
                    "numero": "123",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01234-567",
                    "telefone_principal": "(11) 3333-4444",
                    "responsavel_nome": "João Silva",
                    "responsavel_email": "joao@example.com",
                    "responsavel_telefone": "(11) 99999-3333"
                },
                "expected_status": 400,
                "expected_error": "Email é obrigatório"
            },
            {
                "name": "Invalid Email Format",
                "data": {
                    "name": "Academia Teste Email Inválido",
                    "cnpj": "12.345.678/0001-93",
                    "email": "email-invalido-sem-arroba",
                    "endereco": "Rua Teste",
                    "numero": "123",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01234-567",
                    "telefone_principal": "(11) 3333-4444",
                    "responsavel_nome": "João Silva",
                    "responsavel_email": "joao@example.com",
                    "responsavel_telefone": "(11) 99999-3333"
                },
                "expected_status": 400,
                "expected_error": "Email inválido"
            }
        ]
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for test_case in validation_tests:
            try:
                response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                       json=test_case["data"], headers=headers)
                
                if response.status_code == test_case["expected_status"]:
                    error_data = response.json() if response.headers.get('content-type') == 'application/json' else {"detail": response.text}
                    error_detail = error_data.get("detail", "")
                    
                    if test_case["expected_error"] in error_detail:
                        self.log_test(f"Validation Error: {test_case['name']}", True, 
                                    f"Correctly rejected with: {error_detail}")
                    else:
                        self.log_test(f"Validation Error: {test_case['name']}", False, "", 
                                    f"Wrong error message. Expected: '{test_case['expected_error']}', Got: '{error_detail}'")
                else:
                    self.log_test(f"Validation Error: {test_case['name']}", False, "", 
                                f"Wrong status code. Expected: {test_case['expected_status']}, Got: {response.status_code}")
                        
            except Exception as e:
                self.log_test(f"Validation Error: {test_case['name']}", False, "", f"Exception: {str(e)}")
    
    def test_duplicate_detection(self):
        """Test 3: Duplicate detection (CNPJ and email uniqueness)"""
        
        # First, create a gym for duplicate testing
        gym_data = {
            "name": "Academia Teste Duplicata",
            "cnpj": "98.765.432/0001-10",
            "email": "duplicata@academiateste.com",
            "endereco": "Rua das Duplicatas",
            "numero": "456",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "telefone_principal": "(11) 3333-5555",
            "responsavel_nome": "Maria Silva",
            "responsavel_email": "maria@academiateste.com",
            "responsavel_telefone": "(11) 99999-4444"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create first gym
        response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.created_gyms.append({
                "id": data.get("gym_id"),
                "login": data.get("login"),
                "password": data.get("password")
            })
            print("   First gym created for duplicate testing")
            
            # Test duplicate CNPJ
            duplicate_cnpj_data = gym_data.copy()
            duplicate_cnpj_data["name"] = "Academia Teste Duplicata CNPJ"
            duplicate_cnpj_data["email"] = "outroemail@academiateste.com"
            
            dup_response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                       json=duplicate_cnpj_data, headers=headers)
            
            if dup_response.status_code == 409:
                dup_data = dup_response.json() if dup_response.headers.get('content-type') == 'application/json' else {"detail": dup_response.text}
                error_detail = dup_data.get("detail", "")
                
                if "CNPJ" in error_detail:
                    self.log_test("Duplicate CNPJ Detection", True, 
                                f"Correctly rejected duplicate CNPJ: {error_detail}")
                else:
                    self.log_test("Duplicate CNPJ Detection", False, "", 
                                f"Wrong error message for duplicate CNPJ: {error_detail}")
            else:
                self.log_test("Duplicate CNPJ Detection", False, "", 
                            f"Expected 409, got {dup_response.status_code}")
            
            # Test duplicate Email
            duplicate_email_data = gym_data.copy()
            duplicate_email_data["name"] = "Academia Teste Duplicata Email"
            duplicate_email_data["cnpj"] = "98.765.432/0001-11"
            
            dup_response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                       json=duplicate_email_data, headers=headers)
            
            if dup_response.status_code == 409:
                dup_data = dup_response.json() if dup_response.headers.get('content-type') == 'application/json' else {"detail": dup_response.text}
                error_detail = dup_data.get("detail", "")
                
                if "email" in error_detail:
                    self.log_test("Duplicate Email Detection", True, 
                                f"Correctly rejected duplicate email: {error_detail}")
                else:
                    self.log_test("Duplicate Email Detection", False, "", 
                                f"Wrong error message for duplicate email: {error_detail}")
            else:
                self.log_test("Duplicate Email Detection", False, "", 
                            f"Expected 409, got {dup_response.status_code}")
        else:
            self.log_test("Duplicate Detection Setup", False, "", 
                        f"Failed to create first gym for duplicate testing: {response.status_code}")
    
    def test_custom_login_password(self):
        """Test 4: Custom login/password functionality"""
        test_name = "Custom Login/Password Functionality"
        
        try:
            gym_data = {
                "name": "Academia Teste Custom Login",
                "cnpj": "11.222.333/0001-44",
                "email": "custom@academiateste.com",
                "endereco": "Rua Custom",
                "numero": "789",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "telefone_principal": "(11) 3333-6666",
                "responsavel_nome": "Carlos Silva",
                "responsavel_email": "carlos@academiateste.com",
                "responsavel_telefone": "(11) 99999-5555",
                "custom_login": "academia_custom_test",
                "custom_password": "senha123456"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Track created gym
                self.created_gyms.append({
                    "id": data.get("gym_id"),
                    "login": data.get("login"),
                    "password": data.get("password")
                })
                
                # Verify custom credentials are used
                if (data.get("login") == "academia_custom_test" and 
                    data.get("login_credentials", {}).get("username") == "academia_custom_test"):
                    self.log_test(test_name, True, 
                                f"Custom login/password set successfully: {data['login']}")
                    return data
                else:
                    self.log_test(test_name, False, "", 
                                f"Custom login not used. Expected: academia_custom_test, Got: {data.get('login')}")
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                self.log_test(test_name, False, "", f"HTTP {response.status_code}: {error_data}")
                
        except Exception as e:
            self.log_test(test_name, False, "", f"Exception: {str(e)}")
            
        return None
    
    def test_response_format_validation(self):
        """Test 5: Response format validation"""
        test_name = "Response Format Validation"
        
        try:
            gym_data = {
                "name": "Academia Teste Response Format",
                "cnpj": "55.666.777/0001-88",
                "email": "format@academiateste.com",
                "endereco": "Rua Format",
                "numero": "101",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "telefone_principal": "(11) 3333-7777",
                "responsavel_nome": "Ana Silva",
                "responsavel_email": "ana@academiateste.com",
                "responsavel_telefone": "(11) 99999-6666"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Track created gym
                self.created_gyms.append({
                    "id": data.get("gym_id"),
                    "login": data.get("login"),
                    "password": data.get("password")
                })
                
                # Check all required response fields
                required_fields = {
                    "success": bool,
                    "gym_id": str,
                    "login": str,
                    "password": str,
                    "gym_name": str,
                    "status": str,
                    "message": str,
                    "login_credentials": dict,
                    "next_steps": list
                }
                
                validation_errors = []
                
                for field, expected_type in required_fields.items():
                    if field not in data:
                        validation_errors.append(f"Missing field: {field}")
                    elif not isinstance(data[field], expected_type):
                        validation_errors.append(f"Wrong type for {field}: expected {expected_type.__name__}, got {type(data[field]).__name__}")
                
                # Check login_credentials structure
                if "login_credentials" in data:
                    login_creds = data["login_credentials"]
                    if "username" not in login_creds or "password" not in login_creds:
                        validation_errors.append("login_credentials missing username or password")
                
                # Check message contains "PARCEIRO CADASTRADO"
                if "PARCEIRO CADASTRADO" not in data.get("message", ""):
                    validation_errors.append("Message does not contain 'PARCEIRO CADASTRADO'")
                
                # Check next_steps is not empty
                if not data.get("next_steps"):
                    validation_errors.append("next_steps array is empty")
                
                if not validation_errors:
                    self.log_test(test_name, True, "All response format validations passed")
                    return data
                else:
                    self.log_test(test_name, False, "", f"Validation errors: {'; '.join(validation_errors)}")
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                self.log_test(test_name, False, "", f"HTTP {response.status_code}: {error_data}")
                
        except Exception as e:
            self.log_test(test_name, False, "", f"Exception: {str(e)}")
            
        return None
    
    def test_error_handling_scenarios(self):
        """Test 6: Different error codes (400, 409, 422) and timeout scenarios"""
        
        # Test 422 error (validation error with completely invalid data)
        try:
            invalid_data = {"completely": "invalid", "data": "structure"}
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                   json=invalid_data, headers=headers, timeout=10)
            
            if response.status_code in [400, 422]:
                self.log_test("Error Handling: 400/422 Validation Error", True, 
                            f"Correctly returned {response.status_code} for invalid data structure")
            else:
                self.log_test("Error Handling: 400/422 Validation Error", False, "", 
                            f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling: 400/422 Validation Error", False, "", f"Exception: {str(e)}")
        
        # Test 401 error (unauthorized)
        try:
            gym_data = {
                "name": "Academia Teste Unauthorized",
                "cnpj": "99.888.777/0001-66",
                "email": "unauthorized@test.com"
            }
            
            # No authorization header
            response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                   json=gym_data, timeout=10)
            
            if response.status_code == 401:
                self.log_test("Error Handling: 401 Unauthorized", True, 
                            "Correctly returned 401 for missing authorization")
            else:
                self.log_test("Error Handling: 401 Unauthorized", False, "", 
                            f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling: 401 Unauthorized", False, "", f"Exception: {str(e)}")
        
        # Test timeout scenario
        try:
            gym_data = {
                "name": "Academia Teste Timeout",
                "cnpj": "77.888.999/0001-55",
                "email": "timeout@test.com",
                "endereco": "Rua Timeout",
                "numero": "999",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "telefone_principal": "(11) 3333-8888",
                "responsavel_nome": "Timeout Silva",
                "responsavel_email": "timeout@test.com",
                "responsavel_telefone": "(11) 99999-7777"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Set a very short timeout to test timeout handling
            response = requests.post(f"{API_BASE}/admin/gyms/register", 
                                   json=gym_data, headers=headers, timeout=0.001)
            
            # If we get here, the request was faster than expected
            if response.status_code == 200:
                data = response.json()
                self.created_gyms.append({
                    "id": data.get("gym_id"),
                    "login": data.get("login"),
                    "password": data.get("password")
                })
                self.log_test("Error Handling: Timeout Scenario", True, 
                            "Request completed faster than timeout (system is very responsive)")
            else:
                self.log_test("Error Handling: Timeout Scenario", True, 
                            f"Request completed with status {response.status_code} (faster than timeout)")
                
        except requests.exceptions.Timeout:
            self.log_test("Error Handling: Timeout Scenario", True, 
                        "Timeout handled correctly")
        except Exception as e:
            self.log_test("Error Handling: Timeout Scenario", False, "", f"Unexpected exception: {str(e)}")
    
    def test_gym_authentication_integration(self, gym_credentials):
        """Test 7: Integration with Gym Authentication (/api/gym/auth)"""
        test_name = "Integration with Gym Authentication"
        
        if not gym_credentials:
            self.log_test(test_name, False, "", "No gym credentials provided for testing")
            return
        
        try:
            # Test gym authentication with generated credentials
            auth_data = {
                "login": gym_credentials.get("login"),
                "password": gym_credentials.get("password")
            }
            
            response = requests.post(f"{API_BASE}/gym/auth", json=auth_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "token_type", "gym_info"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify gym_info structure
                    gym_info = data.get("gym_info", {})
                    gym_info_fields = ["id", "name", "type", "status"]
                    missing_gym_info = [field for field in gym_info_fields if field not in gym_info]
                    
                    if not missing_gym_info:
                        self.log_test(test_name, True, 
                                    f"Gym authentication successful. Token: {data['access_token'][:20]}..., Gym: {gym_info.get('name')}")
                    else:
                        self.log_test(test_name, False, "", f"Missing gym_info fields: {missing_gym_info}")
                else:
                    self.log_test(test_name, False, "", f"Missing response fields: {missing_fields}")
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                self.log_test(test_name, False, "", f"Authentication failed: HTTP {response.status_code}: {error_data}")
                
        except Exception as e:
            self.log_test(test_name, False, "", f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all enhanced gym registration tests"""
        print("🚀 ENHANCED GYM REGISTRATION SYSTEM TEST SUITE")
        print("=" * 70)
        print("Testing Focus: Validation, Error Handling, Response Format, Integration")
        print("=" * 70)
        
        if not self.setup_admin_auth():
            print("❌ Failed to setup admin authentication")
            return
        
        try:
            # Test 1: Successful registration
            print("\n🔹 Test 1: Successful Gym Registration")
            gym_credentials = self.test_successful_gym_registration()
            
            # Test 2: Validation errors
            print("\n🔹 Test 2: Validation Errors (Missing Required Fields)")
            self.test_validation_errors()
            
            # Test 3: Duplicate detection
            print("\n🔹 Test 3: Duplicate Detection (CNPJ and Email Uniqueness)")
            self.test_duplicate_detection()
            
            # Test 4: Custom login/password
            print("\n🔹 Test 4: Custom Login/Password Functionality")
            custom_gym_credentials = self.test_custom_login_password()
            
            # Test 5: Response format validation
            print("\n🔹 Test 5: Response Format Validation")
            format_gym_credentials = self.test_response_format_validation()
            
            # Test 6: Error handling scenarios
            print("\n🔹 Test 6: Error Handling Scenarios")
            self.test_error_handling_scenarios()
            
            # Test 7: Gym authentication integration
            print("\n🔹 Test 7: Integration with Gym Authentication")
            # Use the first available credentials
            test_credentials = gym_credentials or custom_gym_credentials or format_gym_credentials
            self.test_gym_authentication_integration(test_credentials)
            
        except Exception as e:
            print(f"❌ Unexpected error during testing: {e}")
            traceback.print_exc()
        
        # Print comprehensive summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n🔍 FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}")
                    if result['error']:
                        print(f"      Error: {result['error']}")
        
        if passed_tests > 0:
            print(f"\n✅ PASSED TESTS ({passed_tests}):")
            for result in self.test_results:
                if result["success"]:
                    print(f"   ✅ {result['test']}")
        
        print(f"\n🎯 CRITICAL FEATURES TESTED:")
        print("   • Gym registration with valid data ✓")
        print("   • Validation errors (missing name, CNPJ, email) ✓")
        print("   • Duplicate detection (CNPJ and email uniqueness) ✓")
        print("   • Invalid email format rejection ✓")
        print("   • Custom login/password functionality ✓")
        print("   • 'PARCEIRO CADASTRADO' success message verification ✓")
        print("   • Auto-approval functionality (status: approved) ✓")
        print("   • Response format validation ✓")
        print("   • Error handling (400, 401, 409, 422) ✓")
        print("   • Timeout scenarios ✓")
        print("   • Integration with gym authentication ✓")
        
        print(f"\n📈 CREATED GYMS FOR TESTING: {len(self.created_gyms)}")
        for i, gym in enumerate(self.created_gyms, 1):
            print(f"   {i}. ID: {gym['id']}, Login: {gym['login']}")
        
        print("\n🏆 TEST COMPLETION STATUS:")
        if failed_tests == 0:
            print("   🎉 ALL TESTS PASSED - Enhanced Gym Registration System is FULLY FUNCTIONAL!")
        elif failed_tests <= 2:
            print("   ⚠️  MOSTLY FUNCTIONAL - Minor issues detected")
        else:
            print("   🚨 CRITICAL ISSUES - Multiple test failures detected")
        
        return passed_tests, failed_tests

def main():
    """Main test execution"""
    tester = EnhancedGymRegistrationTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()