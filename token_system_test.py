#!/usr/bin/env python3
"""
FitPass Brasil Token System Test
Focused test for token generation, validation, and user stats
"""

import requests
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-fitness-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class TokenSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.generated_token = None
        
    def log_result(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
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
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def login_user(self):
        """Login with the specified credentials"""
        print("🔐 Logging in with cliente@fitpass.com...")
        
        login_data = {
            "email": "cliente@fitpass.com",
            "password": "cliente123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.auth_token = data["access_token"]
                self.log_result("User Login", True, "Successfully authenticated")
                return True
            else:
                self.log_result("User Login", False, "No access token in response")
        elif response and response.status_code == 401:
            # User doesn't exist, create demo user
            print("User not found, creating cliente@fitpass.com...")
            demo_user = {
                "email": "cliente@fitpass.com",
                "password": "cliente123",
                "full_name": "Cliente FitPass",
                "phone": "+5511999888777",
                "plan_type": "premium"
            }
            
            reg_response = self.make_request("POST", "/auth/register", demo_user, auth_required=False)
            if reg_response and reg_response.status_code == 200:
                print("Demo user created, attempting login...")
                response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
                if response and response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.log_result("User Login", True, "Created user and logged in successfully")
                    return True
        
        self.log_result("User Login", False, f"Status: {response.status_code if response else 'No response'}")
        return False
    
    def test_token_generation(self):
        """Test POST /api/tokens/generate"""
        print("\n🎫 Testing Token Generation...")
        
        if not self.auth_token:
            self.log_result("Token Generation", False, "No auth token available")
            return False
        
        # Generate a gym token using query parameters
        endpoint = "/tokens/generate?token_type=gym&gym_id=academia-teste-123&validity_hours=3"
        
        response = self.make_request("POST", endpoint, data={})
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["token_code", "qr_code", "expires_at", "type"]
            
            if all(field in data for field in required_fields):
                self.generated_token = data["token_code"]
                expires_at = data["expires_at"]
                self.log_result("Token Generation", True, 
                              f"Token: {data['token_code'][:12]}..., Expires: {expires_at}, Type: {data['type']}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Token Generation", False, f"Missing fields: {missing}")
        else:
            error_detail = ""
            if response:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "")
                except:
                    error_detail = response.text
            self.log_result("Token Generation", False, 
                          f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        
        return False
    
    def test_token_validation(self):
        """Test POST /api/tokens/validate"""
        print("\n✅ Testing Token Validation...")
        
        if not self.generated_token:
            self.log_result("Token Validation", False, "No token available to validate")
            return False
        
        # Validate the generated token
        gym_id = "academia-teste-123"
        endpoint = f"/tokens/validate/{self.generated_token}?gym_id={gym_id}"
        
        response = self.make_request("POST", endpoint, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "valid" in data and data["valid"] and "user" in data:
                user_info = data["user"]
                self.log_result("Token Validation", True, 
                              f"Valid token for: {user_info['full_name']} ({user_info['plan_type']} plan)")
                return True
            else:
                self.log_result("Token Validation", False, "Invalid token response format")
        else:
            error_detail = ""
            if response:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "")
                except:
                    error_detail = response.text
            self.log_result("Token Validation", False, 
                          f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        
        return False
    
    def test_user_stats(self):
        """Test GET /api/users/stats"""
        print("\n📊 Testing User Statistics...")
        
        if not self.auth_token:
            self.log_result("User Stats", False, "No auth token available")
            return False
        
        response = self.make_request("GET", "/users/stats")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_workouts", "completed_workouts", "completion_rate", 
                             "tokens_available", "tokens_used", "gyms_visited"]
            
            if all(field in data for field in required_fields):
                self.log_result("User Stats", True, 
                              f"Tokens Available: {data['tokens_available']}, " +
                              f"Tokens Used: {data['tokens_used']}, " +
                              f"Gyms Visited: {data['gyms_visited']}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("User Stats", False, f"Missing fields: {missing}")
        else:
            error_detail = ""
            if response:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "")
                except:
                    error_detail = response.text
            self.log_result("User Stats", False, 
                          f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        
        return False
    
    def run_token_system_tests(self):
        """Run focused token system tests"""
        print("🚀 FitPass Brasil - Token System Test")
        print(f"Testing against: {API_BASE}")
        print(f"User credentials: cliente@fitpass.com / cliente123")
        print("="*60)
        
        # Step 1: Login
        if not self.login_user():
            print("\n❌ Cannot proceed without authentication")
            return False
        
        # Step 2: Test token generation
        token_gen_success = self.test_token_generation()
        
        # Step 3: Test token validation
        token_val_success = self.test_token_validation()
        
        # Step 4: Test user stats
        stats_success = self.test_user_stats()
        
        # Summary
        print("\n" + "="*60)
        print("📋 TOKEN SYSTEM TEST SUMMARY")
        print("="*60)
        
        tests = [
            ("Token Generation", token_gen_success),
            ("Token Validation", token_val_success),
            ("User Statistics", stats_success)
        ]
        
        passed = sum(1 for _, success in tests if success)
        total = len(tests)
        
        for test_name, success in tests:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\nResult: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 Token system is working correctly!")
            return True
        else:
            print("⚠️  Some token system tests failed.")
            return False

if __name__ == "__main__":
    tester = TokenSystemTester()
    success = tester.run_token_system_tests()