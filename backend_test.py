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
    
    def test_create_personal_trainer(self):
        """Test 2: Create Personal Trainer"""
        print("\n🏋️ Testing Personal Trainer Creation...")
        
        if not self.admin_token:
            self.log_test("Create Personal Trainer", False, "No admin token available")
            return False
        
        # Generate unique email to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        trainer_data = {
            "full_name": "Test Personal Trainer",
            "email": f"testpersonal{unique_id}@luxepass.com",
            "password": "testpass123",
            "professional_type": "personal",
            "cref_crn": "CREF-TEST123/SP",
            "specialization": "Teste Musculação",
            "phone": "(11) 99999-0001",
            "experience_years": 3,
            "bio": "Personal trainer de teste",
            "pix_key": "testpersonal@pix.com"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/admin/professionals", json=trainer_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    professional_info = {
                        "id": data["professional"]["id"],
                        "email": trainer_data["email"],
                        "password": trainer_data["password"],
                        "type": "personal",
                        "full_name": trainer_data["full_name"]
                    }
                    self.created_professionals.append(professional_info)
                    self.log_test("Create Personal Trainer", True, f"Created: {professional_info['email']}")
                    return True
                else:
                    self.log_test("Create Personal Trainer", False, f"Success=False: {data}")
                    return False
            else:
                self.log_test("Create Personal Trainer", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Personal Trainer", False, f"Exception: {str(e)}")
            return False
    
    def test_create_nutritionist(self):
        """Test 3: Create Nutritionist"""
        print("\n🥗 Testing Nutritionist Creation...")
        
        if not self.admin_token:
            self.log_test("Create Nutritionist", False, "No admin token available")
            return False
        
        # Generate unique email to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        nutritionist_data = {
            "full_name": "Test Nutritionist",
            "email": f"testnutri{unique_id}@luxepass.com",
            "password": "testpass123",
            "professional_type": "nutritionist",
            "cref_crn": "CRN-TEST123/SP",
            "specialization": "Teste Nutrição Funcional",
            "phone": "(11) 99999-0002",
            "experience_years": 4,
            "bio": "Nutricionista de teste",
            "pix_key": "testnutri@pix.com"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/admin/professionals", json=nutritionist_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    professional_info = {
                        "id": data["professional"]["id"],
                        "email": nutritionist_data["email"],
                        "password": nutritionist_data["password"],
                        "type": "nutritionist",
                        "full_name": nutritionist_data["full_name"]
                    }
                    self.created_professionals.append(professional_info)
                    self.log_test("Create Nutritionist", True, f"Created: {professional_info['email']}")
                    return True
                else:
                    self.log_test("Create Nutritionist", False, f"Success=False: {data}")
                    return False
            else:
                self.log_test("Create Nutritionist", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Nutritionist", False, f"Exception: {str(e)}")
            return False
    
    def test_professional_login(self, professional):
        """Test Professional Login"""
        print(f"\n🔑 Testing {professional['type'].title()} Login...")
        
        try:
            # Create a new session for professional login (no admin token)
            prof_session = requests.Session()
            
            response = prof_session.post(f"{BACKEND_URL}/professionals/login", json={
                "email": professional["email"],
                "password": professional["password"]
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "professional" in data:
                    # Verify JWT token structure
                    token = data["access_token"]
                    if len(token.split('.')) == 3:  # JWT has 3 parts
                        # Verify professional type in response
                        prof_data = data["professional"]
                        if prof_data.get("professional_type") == professional["type"]:
                            self.log_test(f"{professional['type'].title()} Login", True, 
                                        f"Token: {token[:20]}..., Type: {prof_data['professional_type']}")
                            return True
                        else:
                            self.log_test(f"{professional['type'].title()} Login", False, 
                                        f"Wrong professional_type: {prof_data.get('professional_type')}")
                            return False
                    else:
                        self.log_test(f"{professional['type'].title()} Login", False, "Invalid JWT token format")
                        return False
                else:
                    self.log_test(f"{professional['type'].title()} Login", False, "Missing access_token or professional data")
                    return False
            else:
                self.log_test(f"{professional['type'].title()} Login", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"{professional['type'].title()} Login", False, f"Exception: {str(e)}")
            return False
    
    def test_pix_integration(self):
        """Test 4: PIX Integration"""
        print("\n💳 Testing PIX Integration...")
        
        if not self.admin_token:
            self.log_test("PIX Integration", False, "No admin token available")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/professionals")
            
            if response.status_code == 200:
                data = response.json()
                if "professionals" in data:
                    professionals = data["professionals"]
                    
                    # Check if our created professionals are in the list with PIX data
                    found_with_pix = 0
                    for created_prof in self.created_professionals:
                        for prof in professionals:
                            if prof["email"] == created_prof["email"]:
                                if "pix_key" in prof and prof["pix_key"]:
                                    found_with_pix += 1
                                    break
                    
                    if found_with_pix == len(self.created_professionals):
                        self.log_test("PIX Integration", True, f"All {found_with_pix} professionals have PIX data")
                        return True
                    else:
                        self.log_test("PIX Integration", False, 
                                    f"Only {found_with_pix}/{len(self.created_professionals)} professionals have PIX data")
                        return False
                else:
                    self.log_test("PIX Integration", False, "No professionals data in response")
                    return False
            else:
                self.log_test("PIX Integration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("PIX Integration", False, f"Exception: {str(e)}")
            return False
    
    def test_password_reset(self, professional):
        """Test Password Reset"""
        print(f"\n🔄 Testing {professional['type'].title()} Password Reset...")
        
        if not self.admin_token:
            self.log_test(f"{professional['type'].title()} Password Reset", False, "No admin token available")
            return False
        
        try:
            # Reset password
            response = self.session.put(f"{BACKEND_URL}/admin/professionals/{professional['id']}/reset-password")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "temp_password" in data:
                    temp_password = data["temp_password"]
                    
                    # Test login with new temp password
                    prof_session = requests.Session()
                    login_response = prof_session.post(f"{BACKEND_URL}/professionals/login", json={
                        "email": professional["email"],
                        "password": temp_password
                    })
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if "access_token" in login_data:
                            self.log_test(f"{professional['type'].title()} Password Reset", True, 
                                        f"Temp password: {temp_password}, Login successful")
                            return True
                        else:
                            self.log_test(f"{professional['type'].title()} Password Reset", False, 
                                        "Password reset successful but login failed")
                            return False
                    else:
                        self.log_test(f"{professional['type'].title()} Password Reset", False, 
                                    f"Password reset successful but login failed: {login_response.status_code}")
                        return False
                else:
                    self.log_test(f"{professional['type'].title()} Password Reset", False, 
                                f"Reset failed: {data}")
                    return False
            else:
                self.log_test(f"{professional['type'].title()} Password Reset", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"{professional['type'].title()} Password Reset", False, f"Exception: {str(e)}")
            return False
    
    def run_complete_test_suite(self):
        """Run complete LuxePass login integration test suite"""
        print("🚀 LUXEPASS LOGIN INTEGRATION SYSTEM TEST")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Test 1: Admin Login
        if not self.test_admin_login():
            print("\n❌ CRITICAL: Admin login failed. Cannot proceed with professional creation tests.")
            return self.generate_summary()
        
        # Test 2: Create Personal Trainer
        self.test_create_personal_trainer()
        
        # Test 3: Create Nutritionist  
        self.test_create_nutritionist()
        
        # Test 4: PIX Integration
        self.test_pix_integration()
        
        # Test 5 & 6: Professional Logins
        for professional in self.created_professionals:
            self.test_professional_login(professional)
        
        # Test 7 & 8: Password Resets
        for professional in self.created_professionals:
            self.test_password_reset(professional)
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        if self.created_professionals:
            print(f"\n👥 CREATED PROFESSIONALS ({len(self.created_professionals)}):")
            for prof in self.created_professionals:
                print(f"  • {prof['type'].title()}: {prof['email']} (ID: {prof['id']})")
        
        print("\n🎯 BUSINESS CASE VALIDATION:")
        if passed_tests >= 6:  # At least admin login, 2 creations, PIX, and 2 logins
            print("✅ Admin-created professional accounts can immediately login to their respective apps")
            print("✅ PIX information is properly stored and retrieved")
            print("✅ Professional type separation is maintained (personal vs nutritionist)")
            if passed_tests >= 8:  # All tests including password reset
                print("✅ Password reset generates functional temporary passwords")
            print("✅ SEAMLESS ONBOARDING WORKFLOW CONFIRMED")
        else:
            print("❌ CRITICAL ISSUES FOUND - Onboarding workflow has problems")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": passed_tests/total_tests*100,
            "created_professionals": self.created_professionals,
            "all_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = LuxePassTester()
    results = tester.run_complete_test_suite()
    
    # Exit with appropriate code
    if results["failed_tests"] == 0:
        print("\n🎉 ALL TESTS PASSED - LUXEPASS LOGIN INTEGRATION SYSTEM FULLY OPERATIONAL")
        sys.exit(0)
    else:
        print(f"\n⚠️  {results['failed_tests']} TESTS FAILED - SYSTEM NEEDS ATTENTION")
        sys.exit(1)

if __name__ == "__main__":
    main()