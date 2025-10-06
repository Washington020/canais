#!/usr/bin/env python3
"""
LuxePass Academia Creation and Login Integration Flow Test
Testing complete flow from admin creation to gym system access
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://trainer-client-app-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class LuxePassAcademiaTest:
    def __init__(self):
        self.admin_token = None
        self.created_gym_id = None
        self.created_login = None
        self.created_password = None
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
    
    def test_create_academia(self):
        """Test 2: Create New Academia via Admin"""
        if not self.admin_token:
            self.log_test("Create Academia", False, error="No admin token available")
            return False
            
        try:
            academia_data = {
                "name": "Academia Teste Admin",
                "cnpj": "12.345.678/0001-90",
                "razao_social": "Academia Teste Admin LTDA",
                "endereco": "Rua das Academias",
                "numero": "456",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567",
                "email": "contato@academiateste.com.br",
                "telefone_principal": "(11) 3333-5555",
                "tipo_academia": "Completa",
                "responsavel_nome": "Maria Silva",
                "responsavel_email": "maria@academiateste.com.br",
                "responsavel_telefone": "(11) 99999-4444",
                "custom_login": "academia_admin_teste",
                "custom_password": "admintest123"
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/gyms/register", json=academia_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.created_gym_id = data.get("gym_id")
                self.created_login = data.get("login")
                self.created_password = data.get("password")
                
                self.log_test("Create Academia", True, 
                    f"Academia created - ID: {self.created_gym_id}, Login: {self.created_login}")
                return True
            else:
                self.log_test("Create Academia", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Academia", False, error=str(e))
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
    
    def test_login_integration(self):
        """Test 5: Test Login Integration"""
        if not self.created_login or not self.created_password:
            self.log_test("Login Integration", False, error="Missing created credentials")
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
                    self.log_test("Login Integration", True, 
                        f"Login successful - Gym: {gym_info.get('name')}, Token: {len(access_token)} chars")
                    return True
                else:
                    self.log_test("Login Integration", False, error="Missing access_token or gym_info in response")
                    return False
            else:
                self.log_test("Login Integration", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Login Integration", False, error=str(e))
            return False
    
    def test_password_reset(self):
        """Test 6: Test Password Reset Function"""
        if not self.admin_token or not self.created_gym_id:
            self.log_test("Password Reset", False, error="Missing admin token or gym ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.put(f"{API_BASE}/admin/gyms/{self.created_gym_id}/reset-password", 
                                  headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                new_password = data.get("new_password")
                login = data.get("login")
                
                if new_password and login:
                    # Test login with new password
                    login_response = requests.post(f"{API_BASE}/gym/auth", json={
                        "login": login,
                        "password": new_password
                    })
                    
                    if login_response.status_code == 200:
                        self.log_test("Password Reset", True, 
                            f"Password reset successful - New password works for login: {login}")
                        # Update stored password for next test
                        self.created_password = new_password
                        return True
                    else:
                        self.log_test("Password Reset", False, 
                            error=f"New password doesn't work - Login failed: {login_response.status_code}")
                        return False
                else:
                    self.log_test("Password Reset", False, error="Missing new_password or login in response")
                    return False
            else:
                self.log_test("Password Reset", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Password Reset", False, error=str(e))
            return False
    
    def test_custom_password_setting(self):
        """Test 7: Test Custom Password Setting"""
        if not self.admin_token or not self.created_gym_id:
            self.log_test("Custom Password Setting", False, error="Missing admin token or gym ID")
            return False
            
        try:
            custom_password = "novasenha456"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.put(f"{API_BASE}/admin/gyms/{self.created_gym_id}/set-password", 
                                  json={"password": custom_password}, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                login = data.get("login")
                
                if login:
                    # Test login with custom password
                    login_response = requests.post(f"{API_BASE}/gym/auth", json={
                        "login": login,
                        "password": custom_password
                    })
                    
                    if login_response.status_code == 200:
                        self.log_test("Custom Password Setting", True, 
                            f"Custom password set successfully - Login works with: {login}")
                        return True
                    else:
                        self.log_test("Custom Password Setting", False, 
                            error=f"Custom password doesn't work - Login failed: {login_response.status_code}")
                        return False
                else:
                    self.log_test("Custom Password Setting", False, error="Missing login in response")
                    return False
            else:
                self.log_test("Custom Password Setting", False, 
                    error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Custom Password Setting", False, error=str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🎯 LUXEPASS ACADEMIA CREATION AND LOGIN INTEGRATION FLOW TEST")
        print("=" * 70)
        print(f"Backend URL: {API_BASE}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Run tests in sequence
        tests = [
            self.test_admin_login,
            self.test_create_academia,
            self.test_verify_academia_creation,
            self.test_approve_academia,
            self.test_login_integration,
            self.test_password_reset,
            self.test_custom_password_setting
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Academia creation and login integration flow is working perfectly!")
        else:
            print("⚠️  SOME TESTS FAILED - Check the details above")
            
        print()
        print("BUSINESS CASE VALIDATION:")
        if passed >= 5:  # At least admin login, creation, verification, approval, and login integration
            print("✅ Admin can create academias with custom credentials")
            print("✅ Created credentials work immediately in gym auth system")
            print("✅ Complete integration between admin → gym login system working")
        else:
            print("❌ Critical business workflow issues detected")
        
        return passed == total

def main():
    """Main test execution"""
    tester = LuxePassAcademiaTest()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()