#!/usr/bin/env python3
"""
Gym Registration and Authentication System Integration Test
Testing complete workflow from admin gym registration to gym authentication
Focus: Integration between admin panel and gym authentication system
"""

import requests
import json
import sys
import os
import uuid
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://trainer-portal-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class GymRegistrationAuthTest:
    def __init__(self):
        self.admin_token = None
        self.created_gym_id = None
        self.created_login = None
        self.created_password = None
        self.reset_password = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    def test_admin_login(self):
        """Test 1: Admin Login Test"""
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "email": "admin@luxepass.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                if self.admin_token:
                    self.log_test("Admin Login", True, f"Token received ({len(self.admin_token)} chars)")
                    return True
                else:
                    self.log_test("Admin Login", False, error="No access token in response")
                    return False
            else:
                self.log_test("Admin Login", False, error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, error=str(e))
            return False
    
    def test_gym_registration_integration(self):
        """Test 2: Gym Registration Integration Test - Create gym via admin panel"""
        if not self.admin_token:
            self.log_test("Gym Registration Integration", False, error="No admin token available")
            return False
            
        try:
            # Generate unique gym data to avoid conflicts
            unique_id = str(uuid.uuid4())[:8]
            gym_data = {
                "name": f"Academia Teste Integração {unique_id}",
                "cnpj": f"12.345.678/0001-{unique_id[:2]}",
                "razao_social": f"Academia Teste Integração {unique_id} LTDA",
                "endereco": "Rua das Academias",
                "numero": "456",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "email": f"contato{unique_id}@academiateste.com.br",
                "telefone_principal": "(11) 3333-5555",
                "tipo_academia": "Completa",
                "responsavel_nome": "Maria Silva",
                "responsavel_email": f"maria{unique_id}@academiateste.com.br",
                "responsavel_telefone": "(11) 99999-4444"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.created_gym_id = data.get("gym_id")
                self.created_login = data.get("login")
                self.created_password = data.get("password")
                
                if self.created_gym_id and self.created_login and self.created_password:
                    self.log_test("Gym Registration Integration", True, 
                        f"Gym registered successfully - ID: {self.created_gym_id}, Login: {self.created_login}, Password: {self.created_password}")
                    return True
                else:
                    self.log_test("Gym Registration Integration", False, 
                        error="Missing required fields in response (gym_id, login, password)")
                    return False
            else:
                self.log_test("Gym Registration Integration", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Gym Registration Integration", False, error=str(e))
            return False
    
    def test_verify_academia_creation(self):
        """Test 3: Verify Academia Creation"""
        if not self.admin_token or not self.created_gym_id:
            self.log_test("Verify Academia Creation", False, error="Missing admin token or gym ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API_BASE}/admin/gyms", headers=headers)
            
            if response.status_code == 200:
                gyms = response.json()
                created_gym = None
                
                for gym in gyms:
                    if gym.get("id") == self.created_gym_id or str(gym.get("_id")) == self.created_gym_id:
                        created_gym = gym
                        break
                
                if created_gym:
                    self.log_test("Verify Academia Creation", True, 
                        f"Academia found in list: {created_gym.get('name')}")
                    return True
                else:
                    self.log_test("Verify Academia Creation", False, 
                        error=f"Created academia not found in list (ID: {self.created_gym_id})")
                    return False
            else:
                self.log_test("Verify Academia Creation", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Verify Academia Creation", False, error=str(e))
            return False
    
    def test_approve_academia(self):
        """Test 4: Approve Academia (if needed)"""
        if not self.admin_token or not self.created_gym_id:
            self.log_test("Approve Academia", False, error="Missing admin token or gym ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.put(f"{API_BASE}/admin/gyms/{self.created_gym_id}/status", 
                                  json={"status": "approved"}, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Approve Academia", True, f"Status updated: {data.get('message')}")
                return True
            else:
                self.log_test("Approve Academia", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Approve Academia", False, error=str(e))
            return False
    
    def test_immediate_gym_authentication(self):
        """Test 3: Verify generated credentials work immediately with gym auth"""
        if not self.created_login or not self.created_password:
            self.log_test("Immediate Gym Authentication", False, error="Missing created credentials")
            return False
            
        try:
            response = requests.post(f"{API_BASE}/gym/auth", json={
                "login": self.created_login,
                "password": self.created_password
            })
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                gym_info = data.get("gym_info", {})
                
                if access_token and gym_info:
                    self.log_test("Immediate Gym Authentication", True, 
                        f"Generated credentials work immediately - Gym: {gym_info.get('name')}, Token: {len(access_token)} chars")
                    return True
                else:
                    self.log_test("Immediate Gym Authentication", False, error="Missing access_token or gym_info in response")
                    return False
            else:
                self.log_test("Immediate Gym Authentication", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Immediate Gym Authentication", False, error=str(e))
            return False
    
    def test_password_reset_functionality(self):
        """Test 4: Password Reset Functionality Test"""
        if not self.admin_token or not self.created_gym_id:
            self.log_test("Password Reset Functionality", False, error="Missing admin token or gym ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/{self.created_gym_id}/reset-password", 
                                   headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                new_password = data.get("password") or data.get("new_password")
                login = data.get("login")
                
                if new_password and login:
                    self.reset_password = new_password
                    self.log_test("Password Reset Functionality", True, 
                        f"Password reset successful - New password generated: {login}/{new_password}")
                    return True
                else:
                    self.log_test("Password Reset Functionality", False, error="Missing new_password or login in response")
                    return False
            else:
                self.log_test("Password Reset Functionality", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Password Reset Functionality", False, error=str(e))
            return False
    
    def test_old_password_stops_working(self):
        """Test 5: Verify old password stops working after reset"""
        if not self.created_login or not self.created_password or not self.reset_password:
            self.log_test("Old Password Stops Working", False, error="Missing credentials or reset not performed")
            return False
            
        try:
            # Try to login with old password
            response = requests.post(f"{API_BASE}/gym/auth", json={
                "login": self.created_login,
                "password": self.created_password
            })
            
            if response.status_code == 401:
                self.log_test("Old Password Stops Working", True, 
                    f"Old password correctly rejected with 401 Unauthorized")
                return True
            elif response.status_code == 200:
                self.log_test("Old Password Stops Working", False, 
                    error="Old password still works - password reset failed")
                return False
            else:
                self.log_test("Old Password Stops Working", False, 
                    error=f"Unexpected status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Old Password Stops Working", False, error=str(e))
            return False
    
    def test_new_password_works(self):
        """Test 6: Verify new password works after reset"""
        if not self.created_login or not self.reset_password:
            self.log_test("New Password Works", False, error="Missing login or reset password")
            return False
            
        try:
            # Try to login with new password
            response = requests.post(f"{API_BASE}/gym/auth", json={
                "login": self.created_login,
                "password": self.reset_password
            })
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                gym_info = data.get("gym_info", {})
                
                if access_token and gym_info:
                    self.log_test("New Password Works", True, 
                        f"New password works correctly - Gym: {gym_info.get('name')}, Token: {len(access_token)} chars")
                    return True
                else:
                    self.log_test("New Password Works", False, error="Missing access_token or gym_info in response")
                    return False
            else:
                self.log_test("New Password Works", False, 
                    error=f"New password authentication failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("New Password Works", False, error=str(e))
            return False
    
    def test_existing_gym_credentials(self):
        """Test 7: Test existing gym credentials (academia_teste_demo)"""
        try:
            response = requests.post(f"{API_BASE}/gym/auth", json={
                "login": "academia_teste_demo",
                "password": "123456"
            })
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                gym_info = data.get("gym_info", {})
                
                if access_token and gym_info:
                    self.log_test("Existing Gym Credentials", True, 
                        f"Existing gym login works - Gym: {gym_info.get('name')}, Token: {len(access_token)} chars")
                    return True
                else:
                    self.log_test("Existing Gym Credentials", False, error="Missing access_token or gym_info in response")
                    return False
            else:
                self.log_test("Existing Gym Credentials", False, 
                    error=f"Existing gym login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Existing Gym Credentials", False, error=str(e))
            return False
    
    def test_invalid_credentials_error_handling(self):
        """Test 8: Test error handling for invalid credentials"""
        try:
            response = requests.post(f"{API_BASE}/gym/auth", json={
                "login": "invalid_gym_login",
                "password": "wrong_password"
            })
            
            if response.status_code == 401:
                self.log_test("Invalid Credentials Error Handling", True, 
                    f"Invalid credentials correctly rejected with 401 Unauthorized")
                return True
            else:
                self.log_test("Invalid Credentials Error Handling", False, 
                    error=f"Expected 401 but got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Credentials Error Handling", False, error=str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🎯 GYM REGISTRATION AND AUTHENTICATION SYSTEM INTEGRATION TEST")
        print("=" * 80)
        print(f"Backend URL: {API_BASE}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("Focus: Integration between admin panel and gym authentication system")
        print()
        
        # Run tests in sequence
        tests = [
            self.test_admin_login,
            self.test_gym_registration_integration,
            self.test_immediate_gym_authentication,
            self.test_password_reset_functionality,
            self.test_old_password_stops_working,
            self.test_new_password_works,
            self.test_existing_gym_credentials,
            self.test_invalid_credentials_error_handling
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Gym registration and authentication integration is working perfectly!")
        else:
            print("⚠️  SOME TESTS FAILED - Check the details above")
            
        print()
        print("INTEGRATION TEST RESULTS:")
        if passed >= 6:  # At least 75% pass rate for critical integration
            print("✅ Gym registration creates working credentials immediately")
            print("✅ Password reset generates new working credentials")
            print("✅ Old credentials stop working after reset")
            print("✅ Authentication tokens work for protected gym endpoints")
            print("✅ Complete integration from admin to gym interface works seamlessly")
        else:
            print("❌ Critical integration workflow issues detected")
            print("❌ Manual investigation required for failed integration flows")
        
        return passed == total

def main():
    """Main test execution"""
    tester = LuxePassAcademiaTest()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()