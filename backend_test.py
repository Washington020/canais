#!/usr/bin/env python3
"""
LuxePass Login Integration System Comprehensive Test
Testing ALL login integrations across the LuxePass ecosystem
"""

import requests
import json
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://trainer-client-app-4.preview.emergentagent.com')
API_BASE_URL = f"{BACKEND_URL}/api"

class LuxePassLoginTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.tokens = {}  # Store tokens for cross-integration testing
        
    def log_test(self, test_name, success, details, response_data=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {details}")
        
        if response_data and not success:
            print(f"   Response: {response_data}")
    
    def test_admin_login(self):
        """Test Admin Login"""
        try:
            url = f"{API_BASE_URL}/auth/login"
            payload = {
                "email": "admin@luxepass.com",
                "password": "admin123"
            }
            
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'token_type' in data:
                    self.tokens['admin'] = data['access_token']
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Admin login successful, token received (length: {len(data['access_token'])})",
                        data
                    )
                    return True
                else:
                    self.log_test("Admin Login", False, "Missing access_token or token_type in response", data)
                    return False
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_client_logins(self):
        """Test Client Login Tests for all plan types"""
        client_credentials = [
            ("VIP Client", "vip@luxepass.com", "vip123"),
            ("Intermediario Client", "intermediario@luxepass.com", "inter123"),
            ("Basic Client", "cliente@luxepass.com", "cliente123")
        ]
        
        success_count = 0
        
        for client_type, email, password in client_credentials:
            try:
                url = f"{API_BASE_URL}/auth/login"
                payload = {
                    "email": email,
                    "password": password
                }
                
                response = self.session.post(url, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'access_token' in data and 'token_type' in data:
                        self.tokens[client_type.lower().replace(' ', '_')] = data['access_token']
                        self.log_test(
                            f"{client_type} Login", 
                            True, 
                            f"{client_type} login successful, token received",
                            {"token_length": len(data['access_token']), "token_type": data['token_type']}
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{client_type} Login", False, "Missing access_token or token_type", data)
                else:
                    self.log_test(f"{client_type} Login", False, f"HTTP {response.status_code}: {response.text}", response.text)
                    
            except Exception as e:
                self.log_test(f"{client_type} Login", False, f"Exception: {str(e)}")
        
        return success_count == len(client_credentials)
    
    def test_professional_logins(self):
        """Test Professional Login Tests"""
        professional_credentials = [
            ("Personal Trainer", "personal@luxepass.com", "personal123"),
            ("Nutritionist", "nutri@luxepass.com", "nutri123")
        ]
        
        success_count = 0
        
        for prof_type, email, password in professional_credentials:
            try:
                url = f"{API_BASE_URL}/professionals/login"
                payload = {
                    "email": email,
                    "password": password
                }
                
                response = self.session.post(url, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'access_token' in data and 'token_type' in data:
                        self.tokens[prof_type.lower().replace(' ', '_')] = data['access_token']
                        
                        # Verify professional type in token or response
                        professional_info = data.get('professional_info', {})
                        professional_type = professional_info.get('professional_type', 'unknown')
                        
                        self.log_test(
                            f"{prof_type} Login", 
                            True, 
                            f"{prof_type} login successful, professional_type: {professional_type}",
                            {"token_length": len(data['access_token']), "professional_type": professional_type}
                        )
                        success_count += 1
                    else:
                        self.log_test(f"{prof_type} Login", False, "Missing access_token or token_type", data)
                else:
                    self.log_test(f"{prof_type} Login", False, f"HTTP {response.status_code}: {response.text}", response.text)
                    
            except Exception as e:
                self.log_test(f"{prof_type} Login", False, f"Exception: {str(e)}")
        
        return success_count == len(professional_credentials)
    
    def test_gym_login(self):
        """Test Gym Login"""
        try:
            url = f"{API_BASE_URL}/gym/auth"
            payload = {
                "login": "academia_teste",
                "password": "teste123"
            }
            
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'gym_info' in data:
                    self.tokens['gym'] = data['access_token']
                    gym_info = data['gym_info']
                    
                    self.log_test(
                        "Gym Login", 
                        True, 
                        f"Gym login successful, gym: {gym_info.get('name', 'Unknown')}",
                        {
                            "gym_id": gym_info.get('id'),
                            "gym_name": gym_info.get('name'),
                            "gym_type": gym_info.get('type'),
                            "gym_status": gym_info.get('status')
                        }
                    )
                    return True
                else:
                    self.log_test("Gym Login", False, "Missing access_token or gym_info in response", data)
                    return False
            else:
                self.log_test("Gym Login", False, f"HTTP {response.status_code}: {response.text}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Gym Login", False, f"Exception: {str(e)}")
            return False
    
    def test_jwt_token_validation(self):
        """Test JWT token generation and format"""
        success_count = 0
        total_tokens = len(self.tokens)
        
        for token_name, token in self.tokens.items():
            try:
                # Basic JWT format validation (3 parts separated by dots)
                parts = token.split('.')
                if len(parts) == 3:
                    self.log_test(
                        f"JWT Format - {token_name.title()}", 
                        True, 
                        f"Valid JWT format (3 parts), length: {len(token)}"
                    )
                    success_count += 1
                else:
                    self.log_test(
                        f"JWT Format - {token_name.title()}", 
                        False, 
                        f"Invalid JWT format ({len(parts)} parts instead of 3)"
                    )
            except Exception as e:
                self.log_test(f"JWT Format - {token_name.title()}", False, f"Exception: {str(e)}")
        
        return success_count == total_tokens
    
    def test_user_data_retrieval(self):
        """Test user data retrieval with tokens"""
        success_count = 0
        
        # Test client user data retrieval
        client_tokens = {
            'vip_client': '/users/me',
            'intermediario_client': '/users/me', 
            'basic_client': '/users/me'
        }
        
        for token_name, endpoint in client_tokens.items():
            if token_name in self.tokens:
                try:
                    url = f"{API_BASE_URL}{endpoint}"
                    headers = {'Authorization': f'Bearer {self.tokens[token_name]}'}
                    
                    response = self.session.get(url, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'id' in data and 'email' in data:
                            self.log_test(
                                f"User Data - {token_name.replace('_', ' ').title()}", 
                                True, 
                                f"User data retrieved: {data.get('full_name', 'Unknown')} ({data.get('plan_type', 'unknown')})"
                            )
                            success_count += 1
                        else:
                            self.log_test(f"User Data - {token_name.replace('_', ' ').title()}", False, "Missing user data fields", data)
                    else:
                        self.log_test(f"User Data - {token_name.replace('_', ' ').title()}", False, f"HTTP {response.status_code}: {response.text}")
                        
                except Exception as e:
                    self.log_test(f"User Data - {token_name.replace('_', ' ').title()}", False, f"Exception: {str(e)}")
        
        return success_count > 0
    
    def test_admin_professional_integration(self):
        """Test admin → professional integration by creating a new professional"""
        if 'admin' not in self.tokens:
            self.log_test("Admin-Professional Integration", False, "Admin token not available")
            return False
        
        try:
            # First, try to create a new professional via admin
            url = f"{API_BASE_URL}/admin/professionals"
            headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
            
            # Create test professional data
            test_professional = {
                "full_name": "Dr. Test Professional",
                "email": f"testprof_{datetime.now().strftime('%H%M%S')}@luxepass.com",
                "password": "testpass123",
                "professional_type": "nutritionist",
                "cref_crn": "CRN-TEST123/SP",
                "specialization": "Test Nutrition",
                "bio": "Test professional for integration testing",
                "phone": "(11) 99999-9999",
                "experience_years": 5,
                "pix_key": "testprof@pix.com"
            }
            
            response = self.session.post(url, json=test_professional, headers=headers)
            
            if response.status_code == 201:
                data = response.json()
                professional_id = data.get('id')
                created_email = data.get('email')
                temp_password = data.get('temp_password')
                
                if professional_id and created_email and temp_password:
                    # Now test if the created professional can login
                    login_url = f"{API_BASE_URL}/professionals/login"
                    login_payload = {
                        "email": created_email,
                        "password": temp_password
                    }
                    
                    login_response = self.session.post(login_url, json=login_payload)
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if 'access_token' in login_data:
                            self.log_test(
                                "Admin-Professional Integration", 
                                True, 
                                f"Successfully created professional {created_email} and verified login access"
                            )
                            return True
                        else:
                            self.log_test("Admin-Professional Integration", False, "Created professional but login failed - no token")
                            return False
                    else:
                        self.log_test("Admin-Professional Integration", False, f"Created professional but login failed: HTTP {login_response.status_code}")
                        return False
                else:
                    self.log_test("Admin-Professional Integration", False, "Professional created but missing required fields", data)
                    return False
            else:
                self.log_test("Admin-Professional Integration", False, f"Failed to create professional: HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin-Professional Integration", False, f"Exception: {str(e)}")
            return False
    
    def test_app_specific_permissions(self):
        """Test app-specific access permissions"""
        success_count = 0
        
        # Test professional endpoints with professional tokens
        professional_tests = [
            ('personal_trainer', '/professionals/my-assigned-clients'),
            ('nutritionist', '/professionals/unassigned-clients')
        ]
        
        for token_name, endpoint in professional_tests:
            if token_name in self.tokens:
                try:
                    url = f"{API_BASE_URL}{endpoint}"
                    headers = {'Authorization': f'Bearer {self.tokens[token_name]}'}
                    
                    response = self.session.get(url, headers=headers)
                    
                    if response.status_code in [200, 404]:  # 404 is acceptable for empty results
                        self.log_test(
                            f"Professional Access - {token_name.replace('_', ' ').title()}", 
                            True, 
                            f"Access granted to {endpoint}"
                        )
                        success_count += 1
                    else:
                        self.log_test(f"Professional Access - {token_name.replace('_', ' ').title()}", False, f"Access denied: HTTP {response.status_code}")
                        
                except Exception as e:
                    self.log_test(f"Professional Access - {token_name.replace('_', ' ').title()}", False, f"Exception: {str(e)}")
        
        return success_count > 0
    
    def run_comprehensive_test(self):
        """Run all login integration tests"""
        print("🎯 LUXEPASS LOGIN INTEGRATION SYSTEM COMPREHENSIVE TEST")
        print("=" * 60)
        print(f"Backend URL: {API_BASE_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Test 1: Admin Login
        print("1. ADMIN LOGIN TEST")
        admin_success = self.test_admin_login()
        print()
        
        # Test 2: Client Logins
        print("2. CLIENT LOGIN TESTS")
        client_success = self.test_client_logins()
        print()
        
        # Test 3: Professional Logins
        print("3. PROFESSIONAL LOGIN TESTS")
        professional_success = self.test_professional_logins()
        print()
        
        # Test 4: Gym Login
        print("4. GYM LOGIN TEST")
        gym_success = self.test_gym_login()
        print()
        
        # Test 5: JWT Token Validation
        print("5. JWT TOKEN VALIDATION")
        jwt_success = self.test_jwt_token_validation()
        print()
        
        # Test 6: User Data Retrieval
        print("6. USER DATA RETRIEVAL")
        data_success = self.test_user_data_retrieval()
        print()
        
        # Test 7: Admin-Professional Integration
        print("7. ADMIN-PROFESSIONAL INTEGRATION")
        integration_success = self.test_admin_professional_integration()
        print()
        
        # Test 8: App-Specific Permissions
        print("8. APP-SPECIFIC PERMISSIONS")
        permissions_success = self.test_app_specific_permissions()
        print()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        # Detailed results
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
            print()
        
        print("TOKENS COLLECTED:")
        for token_name, token in self.tokens.items():
            print(f"✅ {token_name.replace('_', ' ').title()}: {len(token)} chars")
        print()
        
        # Overall assessment
        critical_systems = [admin_success, client_success, professional_success, gym_success]
        critical_passed = sum(critical_systems)
        
        if critical_passed == len(critical_systems):
            print("🎉 ALL CRITICAL LOGIN SYSTEMS OPERATIONAL")
            print("✅ Admin System: Working")
            print("✅ Client System: Working") 
            print("✅ Professional System: Working")
            print("✅ Gym System: Working")
        else:
            print("🚨 CRITICAL ISSUES FOUND:")
            if not admin_success:
                print("❌ Admin System: Failed")
            if not client_success:
                print("❌ Client System: Failed")
            if not professional_success:
                print("❌ Professional System: Failed")
            if not gym_success:
                print("❌ Gym System: Failed")
        
        print()
        print(f"Test completed at: {datetime.now().isoformat()}")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': (passed_tests/total_tests)*100,
            'critical_systems_working': critical_passed == len(critical_systems),
            'tokens_collected': len(self.tokens),
            'detailed_results': self.test_results
        }

if __name__ == "__main__":
    tester = LuxePassLoginTester()
    results = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    if results['critical_systems_working'] and results['success_rate'] >= 80:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure