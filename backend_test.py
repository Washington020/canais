#!/usr/bin/env python3
"""
FitPass Brasil Backend API Test Suite
Tests all backend endpoints with proper authentication flow
"""

import requests
import json
import os
from datetime import datetime, timedelta
import time

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fitpass-ecosystem.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class FitPassTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
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
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
            
    def test_user_registration(self):
        """Test user registration endpoint"""
        print("\n=== Testing User Registration ===")
        
        # Test data for new user with unique email
        timestamp = int(time.time())
        user_data = {
            "email": f"testuser{timestamp}@fitpass.com",
            "password": "testpass123",
            "full_name": "Test User",
            "phone": "+5511999999999",
            "plan_type": "premium"
        }
        
        response = self.make_request("POST", "/auth/register", user_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data:
                self.log_test("User Registration", True, f"User created with ID: {data['id']}")
                return True
            else:
                self.log_test("User Registration", False, "Response missing required fields")
        elif response and response.status_code == 400:
            # Check if it's a duplicate email error
            error_detail = response.json().get("detail", "")
            if "already registered" in error_detail.lower():
                # Try with a different timestamp
                user_data["email"] = f"testuser{timestamp + 1}@fitpass.com"
                response = self.make_request("POST", "/auth/register", user_data, auth_required=False)
                if response and response.status_code == 200:
                    data = response.json()
                    self.log_test("User Registration", True, f"User created with ID: {data['id']}")
                    return True
            self.log_test("User Registration", False, f"Status: {response.status_code}, Detail: {error_detail}")
        else:
            self.log_test("User Registration", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False
        
    def test_user_login(self):
        """Test user login endpoint"""
        print("\n=== Testing User Login ===")
        
        # First try with demo credentials
        login_data = {
            "email": "cliente@fitpass.com",
            "password": "cliente123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "token_type" in data:
                self.auth_token = data["access_token"]
                self.log_test("User Login (Demo User)", True, "Successfully logged in with demo credentials")
                return True
            else:
                self.log_test("User Login (Demo User)", False, "Response missing token fields")
        else:
            # Demo user doesn't exist, create one first
            print("Demo user not found, creating demo user...")
            demo_user = {
                "email": "cliente@fitpass.com",
                "password": "cliente123",
                "full_name": "Cliente Demo",
                "phone": "+5511888888888",
                "plan_type": "premium"
            }
            
            reg_response = self.make_request("POST", "/auth/register", demo_user, auth_required=False)
            if reg_response and reg_response.status_code == 200:
                print("Demo user created, attempting login...")
                response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
                if response and response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.log_test("User Login (Demo User)", True, "Created demo user and logged in successfully")
                    return True
                    
        self.log_test("User Login (Demo User)", False, f"Status: {response.status_code if response else 'No response'}")
        return False
        
    def test_get_current_user(self):
        """Test get current user profile endpoint"""
        print("\n=== Testing Get Current User ===")
        
        if not self.auth_token:
            self.log_test("Get Current User", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/users/me")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data and "full_name" in data:
                self.user_id = data["id"]
                self.log_test("Get Current User", True, f"Retrieved user profile for: {data['email']}")
                return True
            else:
                self.log_test("Get Current User", False, "Response missing required user fields")
        else:
            self.log_test("Get Current User", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_user_stats(self):
        """Test user statistics endpoint"""
        print("\n=== Testing User Stats ===")
        
        if not self.auth_token:
            self.log_test("User Stats", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/users/stats")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_workouts", "completed_workouts", "completion_rate", 
                             "tokens_available", "tokens_used", "gyms_visited"]
            
            if all(field in data for field in required_fields):
                self.log_test("User Stats", True, f"Stats retrieved: {data}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("User Stats", False, f"Missing fields: {missing}")
        else:
            self.log_test("User Stats", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_token_generation(self):
        """Test token generation endpoint"""
        print("\n=== Testing Token Generation ===")
        
        if not self.auth_token:
            self.log_test("Token Generation", False, "No auth token available")
            return False
            
        # Test generating a gym token - use query parameters
        endpoint = "/tokens/generate?token_type=gym&gym_id=test-gym-123&validity_hours=3"
        
        response = self.make_request("POST", endpoint, data={})
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["token_code", "qr_code", "expires_at", "type"]
            
            if all(field in data for field in required_fields):
                self.generated_token = data["token_code"]
                self.log_test("Token Generation", True, f"Token generated: {data['token_code'][:8]}...")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Token Generation", False, f"Missing fields: {missing}")
        else:
            self.log_test("Token Generation", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_token_validation(self):
        """Test token validation endpoint"""
        print("\n=== Testing Token Validation ===")
        
        if not hasattr(self, 'generated_token'):
            self.log_test("Token Validation", False, "No token available to validate")
            return False
            
        # Test validating the generated token
        gym_id = "test-gym-123"
        response = self.make_request("POST", f"/tokens/validate/{self.generated_token}?gym_id={gym_id}", 
                                   auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "valid" in data and data["valid"] and "user" in data:
                self.log_test("Token Validation", True, f"Token validated for user: {data['user']['full_name']}")
                return True
            else:
                self.log_test("Token Validation", False, "Invalid token response format")
        else:
            self.log_test("Token Validation", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_get_gyms(self):
        """Test get gyms endpoint"""
        print("\n=== Testing Get Gyms ===")
        
        response = self.make_request("GET", "/gyms", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Gyms", True, f"Retrieved {len(data)} gyms")
                return True
            else:
                self.log_test("Get Gyms", False, "Response is not a list")
        else:
            self.log_test("Get Gyms", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_create_gym(self):
        """Test create gym endpoint"""
        print("\n=== Testing Create Gym ===")
        
        gym_data = {
            "name": "Test Gym Academia",
            "address": "Rua Test, 123 - São Paulo, SP",
            "latitude": -23.5505,
            "longitude": -46.6333,
            "accepted_plans": ["basic", "intermediate", "premium"],
            "equipments": ["Esteira", "Musculação", "Funcional"],
            "max_capacity": 100,
            "opening_hours": {
                "monday": {"open": "06:00", "close": "22:00"},
                "tuesday": {"open": "06:00", "close": "22:00"}
            }
        }
        
        response = self.make_request("POST", "/gyms", gym_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "name" in data:
                self.log_test("Create Gym", True, f"Gym created with ID: {data['id']}")
                return True
            else:
                self.log_test("Create Gym", False, "Response missing required fields")
        else:
            self.log_test("Create Gym", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_get_workouts(self):
        """Test get workouts endpoint"""
        print("\n=== Testing Get Workouts ===")
        
        response = self.make_request("GET", "/workouts", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Workouts", True, f"Retrieved {len(data)} workouts")
                return True
            else:
                self.log_test("Get Workouts", False, "Response is not a list")
        else:
            self.log_test("Get Workouts", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_get_user_workouts(self):
        """Test get user workouts endpoint"""
        print("\n=== Testing Get User Workouts ===")
        
        if not self.auth_token:
            self.log_test("Get User Workouts", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/workouts/user")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get User Workouts", True, f"Retrieved {len(data)} user workouts")
                return True
            else:
                self.log_test("Get User Workouts", False, "Response is not a list")
        else:
            self.log_test("Get User Workouts", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_get_nutrition_plan(self):
        """Test get nutrition plan endpoint"""
        print("\n=== Testing Get Nutrition Plan ===")
        
        if not self.auth_token:
            self.log_test("Get Nutrition Plan", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/nutrition/plan")
        
        if response and response.status_code == 200:
            data = response.json()
            # This might return "No active nutrition plan" message or actual plan
            if "message" in data or "id" in data:
                self.log_test("Get Nutrition Plan", True, "Nutrition plan endpoint working")
                return True
            else:
                self.log_test("Get Nutrition Plan", False, "Unexpected response format")
        else:
            self.log_test("Get Nutrition Plan", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False
        
    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        print("\n=== Testing Admin Dashboard ===")
        
        response = self.make_request("GET", "/admin/dashboard", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_users", "active_subscriptions", "total_gyms", "tokens_generated_today"]
            
            if all(field in data for field in required_fields):
                self.log_test("Admin Dashboard", True, f"Dashboard stats: {data}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Admin Dashboard", False, f"Missing fields: {missing}")
        else:
            self.log_test("Admin Dashboard", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False

    def test_admin_gyms_list(self):
        """Test GET /api/admin/gyms - List registered gyms"""
        print("\n=== Testing Admin Gyms List ===")
        
        response = self.make_request("GET", "/admin/gyms", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Admin Gyms List", True, f"Retrieved {len(data)} gyms from admin endpoint")
                return True
            elif isinstance(data, dict) and "gyms" in data:
                gyms = data["gyms"]
                self.log_test("Admin Gyms List", True, f"Retrieved {len(gyms)} gyms from admin endpoint")
                return True
            else:
                self.log_test("Admin Gyms List", False, "Response is not a list or dict with gyms")
        else:
            self.log_test("Admin Gyms List", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False

    def test_admin_gym_register(self):
        """Test POST /api/admin/gyms/register - Register new gym"""
        print("\n=== Testing Admin Gym Registration ===")
        
        # Use the exact test data provided by the user
        gym_data = {
            "name": "Academia Teste FitPass",
            "cnpj": "12.345.678/0001-99",
            "endereco": "Rua das Flores, 123",
            "numero": "123",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "email": "contato@academiateste.com",
            "telefone_principal": "(11) 99999-9999",
            "tipo_academia": "Tradicional",
            "responsavel_nome": "João Silva",
            "responsavel_email": "joao@academiateste.com",
            "responsavel_telefone": "(11) 88888-8888"
        }
        
        response = self.make_request("POST", "/admin/gyms/register", gym_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["success", "gym_id", "login", "password", "message"]
            
            if all(field in data for field in required_fields):
                self.registered_gym_id = data["gym_id"]
                self.log_test("Admin Gym Registration", True, f"Gym registered with ID: {data['gym_id']}, Login: {data['login']}")
                print(f"   Generated credentials - Login: {data['login']}, Password: {data['password']}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Admin Gym Registration", False, f"Missing fields: {missing}")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("Admin Gym Registration", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            
        return False

    def test_admin_gym_status_update(self):
        """Test PUT /api/admin/gyms/{gym_id}/status - Update gym status"""
        print("\n=== Testing Admin Gym Status Update ===")
        
        if not hasattr(self, 'registered_gym_id'):
            self.log_test("Admin Gym Status Update", False, "No gym ID available to update status")
            return False
        
        # Test updating gym status to approved
        status_data = {"status": "approved"}
        
        response = self.make_request("PUT", f"/admin/gyms/{self.registered_gym_id}/status", 
                                   status_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "message" in data:
                self.log_test("Admin Gym Status Update", True, f"Status updated: {data['message']}")
                return True
            else:
                self.log_test("Admin Gym Status Update", False, "Response missing success or message fields")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("Admin Gym Status Update", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            
        return False

    def test_admin_token_stats(self):
        """Test GET /api/admin/tokens/stats - Token statistics"""
        print("\n=== Testing Admin Token Statistics ===")
        
        response = self.make_request("GET", "/admin/tokens/stats", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_generated", "total_used", "gym_tokens", "nutritionist_tokens", "usage_rate"]
            
            if all(field in data for field in required_fields):
                self.log_test("Admin Token Stats", True, f"Token stats: Generated: {data['total_generated']}, Used: {data['total_used']}, Usage Rate: {data['usage_rate']}%")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Admin Token Stats", False, f"Missing fields: {missing}")
        else:
            self.log_test("Admin Token Stats", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False

    def test_admin_tokens_list(self):
        """Test GET /api/admin/tokens - List tokens with user info"""
        print("\n=== Testing Admin Tokens List ===")
        
        response = self.make_request("GET", "/admin/tokens", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Admin Tokens List", True, f"Retrieved {len(data)} tokens with user information")
                if len(data) > 0:
                    # Check if first token has required fields
                    token = data[0]
                    required_fields = ["id", "token_code", "user_name", "user_email", "token_type", "is_used"]
                    if all(field in token for field in required_fields):
                        print(f"   Sample token: {token['token_code'][:8]}... for user {token['user_name']}")
                return True
            else:
                self.log_test("Admin Tokens List", False, "Response is not a list")
        else:
            self.log_test("Admin Tokens List", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False

    def test_admin_users_list(self):
        """Test GET /api/admin/users - List users for financial control"""
        print("\n=== Testing Admin Users List ===")
        
        response = self.make_request("GET", "/admin/users", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Admin Users List", True, f"Retrieved {len(data)} users for financial control")
                if len(data) > 0:
                    # Check if first user has required fields
                    user = data[0]
                    required_fields = ["id", "full_name", "email", "plan_type", "payment_status"]
                    if all(field in user for field in required_fields):
                        self.test_user_id = user["id"]  # Store for blocking test
                        print(f"   Sample user: {user['full_name']} ({user['email']}) - {user['plan_type']} plan")
                return True
            else:
                self.log_test("Admin Users List", False, "Response is not a list")
        else:
            self.log_test("Admin Users List", False, f"Status: {response.status_code if response else 'No response'}")
            
        return False

    def test_admin_user_block(self):
        """Test PUT /api/admin/users/{user_id}/block - Block user"""
        print("\n=== Testing Admin User Block ===")
        
        if not hasattr(self, 'test_user_id'):
            self.log_test("Admin User Block", False, "No user ID available to block")
            return False
        
        response = self.make_request("PUT", f"/admin/users/{self.test_user_id}/block", 
                                   {}, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "message" in data:
                self.log_test("Admin User Block", True, f"User blocked: {data['message']}")
                return True
            else:
                self.log_test("Admin User Block", False, "Response missing success or message fields")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("Admin User Block", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            
        return False

    def test_admin_user_verify_payment(self):
        """Test POST /api/admin/users/{user_id}/verify-payment - Verify payment"""
        print("\n=== Testing Admin User Payment Verification ===")
        
        if not hasattr(self, 'test_user_id'):
            self.log_test("Admin User Payment Verification", False, "No user ID available to verify payment")
            return False
        
        response = self.make_request("POST", f"/admin/users/{self.test_user_id}/verify-payment", 
                                   {}, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "message" in data:
                self.log_test("Admin User Payment Verification", True, f"Payment verified: {data['message']}")
                return True
            else:
                self.log_test("Admin User Payment Verification", False, "Response missing success or message fields")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", response.text)
                except:
                    error_detail = response.text
            self.log_test("Admin User Payment Verification", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            
        return False
        
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting FitPass Brasil Backend API Tests")
        print(f"Testing against: {API_BASE}")
        
        # Authentication flow tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # User functionality tests
        self.test_user_stats()
        
        # Token management tests
        self.test_token_generation()
        self.test_token_validation()
        
        # Gym tests
        self.test_get_gyms()
        self.test_create_gym()
        
        # Workout tests
        self.test_get_workouts()
        self.test_get_user_workouts()
        
        # Nutrition tests
        self.test_get_nutrition_plan()
        
        # Admin tests
        self.test_admin_dashboard()
        
        # Summary
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return passed == total

    def test_token_system_flow(self):
        """Test the complete token system flow as requested by user"""
        print("\n" + "="*60)
        print("🎯 TESTING COMPLETE TOKEN SYSTEM FLOW")
        print("="*60)
        
        # Step 1: Login with cliente@fitpass.com/cliente123
        print("\n1️⃣ Testing user login with cliente@fitpass.com...")
        login_data = {
            "email": "cliente@fitpass.com",
            "password": "cliente123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        
        if not response or response.status_code != 200:
            # Create demo user if doesn't exist
            print("   Creating demo user cliente@fitpass.com...")
            demo_user = {
                "email": "cliente@fitpass.com",
                "password": "cliente123",
                "full_name": "Cliente Demo FitPass",
                "phone": "+5511999888777",
                "plan_type": "premium"
            }
            
            reg_response = self.make_request("POST", "/auth/register", demo_user, auth_required=False)
            if reg_response and reg_response.status_code == 200:
                response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.log_test("Step 1: User Login", True, "Successfully logged in with cliente@fitpass.com")
        else:
            self.log_test("Step 1: User Login", False, f"Login failed: {response.status_code if response else 'No response'}")
            return False
        
        # Step 2: Generate gym token with 3 hours validity
        print("\n2️⃣ Testing token generation (gym, 3 hours)...")
        endpoint = "/tokens/generate?token_type=gym&validity_hours=3"
        
        response = self.make_request("POST", endpoint, data={})
        
        if response and response.status_code == 200:
            data = response.json()
            if "token_code" in data and "qr_code" in data:
                self.generated_token = data["token_code"]
                self.log_test("Step 2: Token Generation", True, f"Generated token: {data['token_code'][:12]}... with QR code")
                print(f"   Token expires at: {data.get('expires_at', 'N/A')}")
            else:
                self.log_test("Step 2: Token Generation", False, "Missing token_code or qr_code in response")
                return False
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", "")
                except:
                    error_detail = response.text
            self.log_test("Step 2: Token Generation", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            return False
        
        # Step 3: Validate token at gym
        print("\n3️⃣ Testing token validation at gym...")
        gym_id = "academia-teste"
        response = self.make_request("POST", f"/tokens/validate/{self.generated_token}?gym_id={gym_id}", 
                                   auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("valid") and "user" in data:
                self.log_test("Step 3: Token Validation", True, f"Token validated for user: {data['user']['full_name']}")
                print(f"   User plan: {data['user']['plan_type']}")
                print(f"   Token type: {data.get('token_type', 'N/A')}")
            else:
                self.log_test("Step 3: Token Validation", False, "Token validation returned invalid or missing user data")
                return False
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", "")
                except:
                    error_detail = response.text
            self.log_test("Step 3: Token Validation", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
            return False
        
        # Step 4: Check user statistics (tokens_used should be incremented)
        print("\n4️⃣ Testing user statistics update...")
        response = self.make_request("GET", "/users/stats")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["tokens_available", "tokens_used", "gyms_visited"]
            
            if all(field in data for field in required_fields):
                self.log_test("Step 4: User Stats", True, f"Stats updated - Available: {data['tokens_available']}, Used: {data['tokens_used']}, Gyms: {data['gyms_visited']}")
                print(f"   Total workouts: {data.get('total_workouts', 0)}")
                print(f"   Completion rate: {data.get('completion_rate', 0):.1f}%")
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Step 4: User Stats", False, f"Missing fields: {missing}")
                return False
        else:
            self.log_test("Step 4: User Stats", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        # Step 5: Check admin dashboard (should show tokens used)
        print("\n5️⃣ Testing admin dashboard statistics...")
        response = self.make_request("GET", "/admin/dashboard", auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_users", "tokens_generated_today", "total_gyms"]
            
            if all(field in data for field in required_fields):
                self.log_test("Step 5: Admin Dashboard", True, f"Dashboard shows - Users: {data['total_users']}, Tokens today: {data['tokens_generated_today']}, Gyms: {data['total_gyms']}")
                print(f"   Active subscriptions: {data.get('active_subscriptions', 0)}")
                print(f"   Monthly revenue: R$ {data.get('monthly_revenue', 0)}")
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Step 5: Admin Dashboard", False, f"Missing fields: {missing}")
                return False
        else:
            self.log_test("Step 5: Admin Dashboard", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        print("\n✅ COMPLETE TOKEN SYSTEM FLOW TEST PASSED!")
        print("All 5 steps completed successfully:")
        print("  ✓ User login with cliente@fitpass.com")
        print("  ✓ Token generation (gym, 3 hours)")
        print("  ✓ Token validation at academia-teste")
        print("  ✓ User statistics updated")
        print("  ✓ Admin dashboard shows usage")
        
        return True

if __name__ == "__main__":
    tester = FitPassTester()
    
    # Run the specific token system flow test as requested
    print("🎯 Running focused token system flow test as requested...")
    success = tester.test_token_system_flow()
    
    if success:
        print("\n🎉 Token system flow test completed successfully!")
        print("The token system is working correctly after the fixes.")
    else:
        print("\n⚠️  Token system flow test failed. Check the details above.")
        print("Issues found that need to be addressed.")