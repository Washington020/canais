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
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://workout-connect.preview.emergentagent.com')
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

if __name__ == "__main__":
    tester = FitPassTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the details above.")