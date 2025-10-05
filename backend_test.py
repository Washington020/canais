#!/usr/bin/env python3
"""
Backend Testing Script for LuxePass Professional Login Credentials
Testing professional login endpoints for Nutritionist and Personal Trainer apps
"""

import requests
import json
import sys
from datetime import datetime
import os

# Get backend URL from environment
BACKEND_URL = "https://trainer-client-app-4.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
    
    def add_result(self, test_name, passed, message=""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.tests_failed += 1
            self.failures.append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failures:
            print(f"\n❌ FAILURES:")
            for failure in self.failures:
                print(f"  - {failure}")

class ProfessionalLoginTester:
    def __init__(self):
        self.base_url = BACKEND_URL
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
            required_fields = ["access_token", "token_type", "professional_info"]
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
            prof_info = data.get("professional_info", {})
            if prof_info.get("professional_type") != expected_type:
                return False, f"Expected professional_type '{expected_type}', got '{prof_info.get('professional_type')}'"
            
            # Check professional info has required fields
            prof_required = ["id", "email", "full_name", "professional_type"]
            prof_missing = [field for field in prof_required if field not in prof_info]
            
            if prof_missing:
                return False, f"Missing professional_info fields: {prof_missing}"
            
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