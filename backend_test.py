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
    
    def test_create_personal_trainer_with_pix(self):
        """Test creating Personal Trainer with PIX key"""
        try:
            # Use unique email to avoid conflicts
            unique_id = uuid.uuid4().hex[:8]
            professional_data = {
                "full_name": "Prof. Ricardo Silva",
                "email": f"ricardo_{unique_id}@luxepass.com",
                "password": "ricardo123",
                "professional_type": "personal",
                "cref_crn": "CREF-555555/SP",
                "specialization": "Musculação e Hipertrofia",
                "phone": "(11) 98765-4321",
                "experience_years": 6,
                "bio": "Personal trainer especializado em hipertrofia muscular",
                "pix_key": "ricardo.silva@pix.com.br"
            }
            
            response = self.session.post(f"{BACKEND_URL}/admin/professionals", json=professional_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "professional" in data:
                    prof_info = data["professional"]
                    self.created_professionals.append({
                        "id": prof_info["id"],
                        "email": prof_info["email"],
                        "password": "ricardo123",
                        "type": "personal"
                    })
                    self.log_test("Create Personal Trainer with PIX", True, 
                                f"Created professional: {prof_info['full_name']} (ID: {prof_info['id']})")
                    return True
                else:
                    self.log_test("Create Personal Trainer with PIX", False, "Invalid response structure", data)
                    return False
            else:
                self.log_test("Create Personal Trainer with PIX", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Personal Trainer with PIX", False, f"Exception: {str(e)}")
            return False
    
    def test_create_nutritionist_with_pix(self):
        """Test creating Nutritionist with PIX key"""
        try:
            # Use unique email to avoid conflicts
            unique_id = uuid.uuid4().hex[:8]
            professional_data = {
                "full_name": "Dra. Fernanda Costa",
                "email": f"fernanda_{unique_id}@luxepass.com",
                "password": "fernanda123",
                "professional_type": "nutritionist",
                "cref_crn": "CRN-555555/SP",
                "specialization": "Nutrição Clínica e Esportiva",
                "phone": "(11) 97654-3210",
                "experience_years": 7,
                "bio": "Nutricionista especializada em nutrição clínica",
                "pix_key": "123.456.789-00"
            }
            
            response = self.session.post(f"{BACKEND_URL}/admin/professionals", json=professional_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "professional" in data:
                    prof_info = data["professional"]
                    self.created_professionals.append({
                        "id": prof_info["id"],
                        "email": prof_info["email"],
                        "password": "fernanda123",
                        "type": "nutritionist"
                    })
                    self.log_test("Create Nutritionist with PIX", True, 
                                f"Created professional: {prof_info['full_name']} (ID: {prof_info['id']})")
                    return True
                else:
                    self.log_test("Create Nutritionist with PIX", False, "Invalid response structure", data)
                    return False
            else:
                self.log_test("Create Nutritionist with PIX", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Nutritionist with PIX", False, f"Exception: {str(e)}")
            return False
    
    def test_get_professionals_with_pix(self):
        """Test GET /api/admin/professionals to verify PIX field appears in response"""
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/professionals")
            
            if response.status_code == 200:
                data = response.json()
                if "professionals" in data:
                    professionals = data["professionals"]
                    
                    # Look for our created professionals
                    ricardo_found = False
                    fernanda_found = False
                    
                    for prof in professionals:
                        if prof.get("email") == "ricardo@luxepass.com":
                            ricardo_found = True
                        elif prof.get("email") == "fernanda@luxepass.com":
                            fernanda_found = True
                    
                    if ricardo_found and fernanda_found:
                        self.log_test("GET Professionals with PIX", True, 
                                    f"Found {len(professionals)} professionals including our created ones")
                        return True
                    else:
                        self.log_test("GET Professionals with PIX", False, 
                                    f"Created professionals not found in list. Ricardo: {ricardo_found}, Fernanda: {fernanda_found}")
                        return False
                else:
                    self.log_test("GET Professionals with PIX", False, "No professionals field in response", data)
                    return False
            else:
                self.log_test("GET Professionals with PIX", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("GET Professionals with PIX", False, f"Exception: {str(e)}")
            return False
    
    def test_professional_login_ricardo(self):
        """Test professional login for Ricardo (Personal Trainer)"""
        try:
            # Use the created professional's email if available, otherwise use existing one
            email = self.created_professionals[0]["email"] if self.created_professionals else "ricardo@luxepass.com"
            response = self.session.post(f"{BACKEND_URL}/professionals/login", json={
                "email": email,
                "password": "ricardo123"
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "professional" in data:
                    prof_info = data["professional"]
                    if prof_info.get("professional_type") == "personal":
                        self.log_test("Professional Login - Ricardo (Personal)", True, 
                                    f"Successfully logged in: {prof_info.get('full_name')}")
                        return True
                    else:
                        self.log_test("Professional Login - Ricardo (Personal)", False, 
                                    f"Wrong professional type: {prof_info.get('professional_type')}")
                        return False
                else:
                    self.log_test("Professional Login - Ricardo (Personal)", False, 
                                "Missing access_token or professional", data)
                    return False
            else:
                self.log_test("Professional Login - Ricardo (Personal)", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Professional Login - Ricardo (Personal)", False, f"Exception: {str(e)}")
            return False
    
    def test_professional_login_fernanda(self):
        """Test professional login for Fernanda (Nutritionist)"""
        try:
            # Use the created professional's email if available, otherwise use existing one
            email = self.created_professionals[1]["email"] if len(self.created_professionals) > 1 else "fernanda@luxepass.com"
            response = self.session.post(f"{BACKEND_URL}/professionals/login", json={
                "email": email,
                "password": "fernanda123"
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "professional" in data:
                    prof_info = data["professional"]
                    if prof_info.get("professional_type") == "nutritionist":
                        self.log_test("Professional Login - Fernanda (Nutritionist)", True, 
                                    f"Successfully logged in: {prof_info.get('full_name')}")
                        return True
                    else:
                        self.log_test("Professional Login - Fernanda (Nutritionist)", False, 
                                    f"Wrong professional type: {prof_info.get('professional_type')}")
                        return False
                else:
                    self.log_test("Professional Login - Fernanda (Nutritionist)", False, 
                                "Missing access_token or professional", data)
                    return False
            else:
                self.log_test("Professional Login - Fernanda (Nutritionist)", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Professional Login - Fernanda (Nutritionist)", False, f"Exception: {str(e)}")
            return False
    
    def test_pix_field_validation(self):
        """Test that PIX field is properly validated and stored"""
        try:
            # Test with different PIX format
            professional_data = {
                "full_name": "Test Professional PIX",
                "email": f"test_pix_{uuid.uuid4().hex[:8]}@luxepass.com",
                "password": "test123",
                "professional_type": "personal",
                "cref_crn": "CREF-TEST/SP",
                "specialization": "Test Specialization",
                "phone": "(11) 99999-9999",
                "experience_years": 5,
                "bio": "Test professional for PIX validation",
                "pix_key": "test-pix-key-validation"
            }
            
            response = self.session.post(f"{BACKEND_URL}/admin/professionals", json=professional_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("PIX Field Validation", True, 
                                "PIX field accepted and stored successfully")
                    return True
                else:
                    self.log_test("PIX Field Validation", False, "Professional creation failed", data)
                    return False
            else:
                self.log_test("PIX Field Validation", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("PIX Field Validation", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all PIX functionality tests"""
        print("🚀 STARTING LUXEPASS PIX PROFESSIONAL MANAGEMENT TESTING")
        print("=" * 70)
        print()
        
        # Test sequence
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Create Personal Trainer with PIX", self.test_create_personal_trainer_with_pix),
            ("Create Nutritionist with PIX", self.test_create_nutritionist_with_pix),
            ("GET Professionals with PIX", self.test_get_professionals_with_pix),
            ("Professional Login - Ricardo", self.test_professional_login_ricardo),
            ("Professional Login - Fernanda", self.test_professional_login_fernanda),
            ("PIX Field Validation", self.test_pix_field_validation)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if test_func():
                passed += 1
        
        # Summary
        print("=" * 70)
        print("🏆 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        if passed == total:
            print("✅ ALL TESTS PASSED - PIX Professional Management System is working correctly!")
        else:
            print("❌ SOME TESTS FAILED - Review the issues above")
            
        print()
        print("📋 CREATED PROFESSIONALS FOR TESTING:")
        for prof in self.created_professionals:
            print(f"   - {prof['email']} (Password: {prof['password']}) - Type: {prof['type']}")
        
        return passed, total

def main():
    """Main test execution"""
    tester = LuxePassTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()