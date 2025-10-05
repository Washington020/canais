#!/usr/bin/env python3
"""
LuxePass Backend Testing Suite - PIX Professional Management System
Testing enhanced professional management with PIX functionality
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "https://trainer-client-app-4.preview.emergentagent.com/api"

class LuxePassTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.created_professionals = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_admin_login(self):
        """Test admin login with admin@luxepass.com/admin123"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "admin@luxepass.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.admin_token}"
                    })
                    self.log_test("Admin Login", True, f"Successfully logged in as admin")
                    return True
                else:
                    self.log_test("Admin Login", False, "No access token in response", data)
                    return False
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
def test_professional_login(email, password, expected_type, test_name):
    """Test professional login endpoint"""
    try:
        url = f"{BACKEND_URL}/professionals/login"
        payload = {
            "email": email,
            "password": password
        }
        
        print(f"\n🔍 Testing {test_name}")
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if response has required fields
            required_fields = ["access_token", "token_type", "professional"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return False, f"Missing required fields: {missing_fields}"
            
            # Check token type
            if data.get("token_type") != "bearer":
                return False, f"Expected token_type 'bearer', got '{data.get('token_type')}'"
            
            # Check access token exists and is not empty
            if not data.get("access_token"):
                return False, "Access token is empty or missing"
            
            # Check professional info
            prof_info = data.get("professional", {})
            if prof_info.get("professional_type") != expected_type:
                return False, f"Expected professional_type '{expected_type}', got '{prof_info.get('professional_type')}'"
            
            # Check professional info has required fields
            prof_required = ["id", "email", "full_name", "professional_type"]
            prof_missing = [field for field in prof_required if field not in prof_info]
            
            if prof_missing:
                return False, f"Missing professional fields: {prof_missing}"
            
            print(f"✅ JWT Token: {data['access_token'][:50]}...")
            print(f"✅ Professional Type: {prof_info['professional_type']}")
            print(f"✅ Professional Name: {prof_info['full_name']}")
            print(f"✅ Professional Email: {prof_info['email']}")
            
            return True, "Login successful with valid JWT token and professional info"
            
        elif response.status_code == 401:
            return False, f"Authentication failed: {response.text}"
        elif response.status_code == 404:
            return False, f"Endpoint not found: {response.text}"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
            
    except requests.exceptions.Timeout:
        return False, "Request timeout (30s)"
    except requests.exceptions.ConnectionError:
        return False, "Connection error - backend may be down"
    except requests.exceptions.RequestException as e:
        return False, f"Request error: {str(e)}"
    except json.JSONDecodeError:
        return False, f"Invalid JSON response: {response.text}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"

def main():
    print("🚀 LUXEPASS PROFESSIONAL LOGIN CREDENTIALS TEST")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    results = TestResults()
    
    # Test 1: Nutritionist Login
    passed, message = test_professional_login(
        email="nutri@luxepass.com",
        password="nutri123", 
        expected_type="nutritionist",
        test_name="Nutritionist Login"
    )
    results.add_result("Nutritionist Login (nutri@luxepass.com)", passed, message)
    
    # Test 2: Personal Trainer Login  
    passed, message = test_professional_login(
        email="personal@luxepass.com",
        password="personal123",
        expected_type="personal", 
        test_name="Personal Trainer Login"
    )
    results.add_result("Personal Trainer Login (personal@luxepass.com)", passed, message)
    
    # Test 3: Invalid credentials test
    try:
        url = f"{BACKEND_URL}/professionals/login"
        payload = {"email": "invalid@luxepass.com", "password": "wrong123"}
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 401:
            results.add_result("Invalid Credentials Test", True, "Correctly rejected invalid credentials")
        else:
            results.add_result("Invalid Credentials Test", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.add_result("Invalid Credentials Test", False, f"Error: {str(e)}")
    
    # Print final summary
    results.print_summary()
    
    # Return appropriate exit code
    if results.tests_failed > 0:
        print(f"\n🚨 {results.tests_failed} test(s) failed!")
        return 1
    else:
        print(f"\n🎉 All {results.tests_passed} tests passed!")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)