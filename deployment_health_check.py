#!/usr/bin/env python3
"""
LuxePass Comprehensive Deployment Health Check
Testing all critical systems for deployment readiness
"""

import requests
import json
import sys
import os
from datetime import datetime, timezone
import time

# Backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wellness-hub-270.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class DeploymentHealthChecker:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.tokens = {}
        self.test_results = []
        self.test_data = {}
        
        # Test credentials from test_result.md
        self.credentials = {
            'admin': {'email': 'admin@luxepass.com', 'password': 'admin123'},
            'client_premium': {'email': 'cliente@luxepass.com', 'password': 'cliente123'},
            'client_vip': {'email': 'vip@luxepass.com', 'password': 'vip123'},
            'client_intermediario': {'email': 'intermediario@luxepass.com', 'password': 'inter123'},
            'nutritionist': {'email': 'nutri@luxepass.com', 'password': 'nutri123'},
            'personal_trainer': {'email': 'personal@luxepass.com', 'password': 'personal123'},
            'gym': {'username': 'academia_teste', 'password': 'teste123'}
        }

    def log_test(self, category, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            "category": category,
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error and not success:
            print(f"   Error: {error}")

    def test_core_backend_services(self):
        """Test core backend API endpoints"""
        print("\n🔍 TESTING CORE BACKEND SERVICES")
        print("=" * 50)
        
        # Test health endpoint
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Core Backend", "Health Check", True, 
                             f"Status: {data.get('status', 'unknown')}")
            else:
                self.log_test("Core Backend", "Health Check", False, 
                             f"Status code: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Core Backend", "Health Check", False, "", str(e))

    def test_authentication_system(self):
        """Test JWT authentication across all user types"""
        print("\n🔐 TESTING AUTHENTICATION SYSTEM")
        print("=" * 50)
        
        # Test admin login
        try:
            response = self.session.post(f"{API_BASE}/auth/login", 
                                       json=self.credentials['admin'], timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.tokens['admin'] = data['access_token']
                self.log_test("Authentication", "Admin Login", True, 
                             f"Token length: {len(data['access_token'])}")
            else:
                self.log_test("Authentication", "Admin Login", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Authentication", "Admin Login", False, "", str(e))
        
        # Test client logins
        for client_type in ['client_premium', 'client_vip', 'client_intermediario']:
            try:
                response = self.session.post(f"{API_BASE}/auth/login", 
                                           json=self.credentials[client_type], timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.tokens[client_type] = data['access_token']
                    self.log_test("Authentication", f"{client_type.title()} Login", True, 
                                 f"Token received")
                else:
                    self.log_test("Authentication", f"{client_type.title()} Login", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Authentication", f"{client_type.title()} Login", False, "", str(e))
        
        # Test professional logins
        for prof_type in ['nutritionist', 'personal_trainer']:
            try:
                response = self.session.post(f"{API_BASE}/professionals/login", 
                                           json=self.credentials[prof_type], timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.tokens[prof_type] = data['access_token']
                    self.log_test("Authentication", f"{prof_type.title()} Login", True, 
                                 f"Professional type: {data.get('professional_type', 'unknown')}")
                else:
                    self.log_test("Authentication", f"{prof_type.title()} Login", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Authentication", f"{prof_type.title()} Login", False, "", str(e))
        
        # Test gym authentication
        try:
            response = self.session.post(f"{API_BASE}/gym/auth", 
                                       json=self.credentials['gym'], timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.tokens['gym'] = data['access_token']
                gym_info = data.get('gym_info', {})
                self.log_test("Authentication", "Gym Login", True, 
                             f"Gym: {gym_info.get('name', 'Unknown')}")
            else:
                self.log_test("Authentication", "Gym Login", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Authentication", "Gym Login", False, "", str(e))

    def test_admin_panel_functionality(self):
        """Test admin panel core features"""
        print("\n👑 TESTING ADMIN PANEL FUNCTIONALITY")
        print("=" * 50)
        
        if 'admin' not in self.tokens:
            self.log_test("Admin Panel", "No Admin Token", False, "Admin login failed")
            return
        
        headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
        
        # Test admin dashboard
        try:
            response = self.session.get(f"{API_BASE}/admin/dashboard", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Panel", "Dashboard", True, 
                             f"Users: {data.get('total_users', 0)}, Gyms: {data.get('total_gyms', 0)}")
            else:
                self.log_test("Admin Panel", "Dashboard", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin Panel", "Dashboard", False, "", str(e))
        
        # Test user management
        try:
            response = self.session.get(f"{API_BASE}/admin/users", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                user_count = len(data) if isinstance(data, list) else data.get('total', 0)
                self.log_test("Admin Panel", "User Management", True, 
                             f"Retrieved {user_count} users")
            else:
                self.log_test("Admin Panel", "User Management", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin Panel", "User Management", False, "", str(e))
        
        # Test gym management
        try:
            response = self.session.get(f"{API_BASE}/admin/gyms", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                gym_count = len(data) if isinstance(data, list) else data.get('total', 0)
                self.log_test("Admin Panel", "Gym Management", True, 
                             f"Retrieved {gym_count} gyms")
            else:
                self.log_test("Admin Panel", "Gym Management", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin Panel", "Gym Management", False, "", str(e))
        
        # Test professional management
        try:
            response = self.session.get(f"{API_BASE}/admin/professionals", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                prof_count = len(data) if isinstance(data, list) else data.get('total', 0)
                self.log_test("Admin Panel", "Professional Management", True, 
                             f"Retrieved {prof_count} professionals")
            else:
                self.log_test("Admin Panel", "Professional Management", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin Panel", "Professional Management", False, "", str(e))

    def test_client_features(self):
        """Test client application features"""
        print("\n👤 TESTING CLIENT FEATURES")
        print("=" * 50)
        
        if 'client_premium' not in self.tokens:
            self.log_test("Client Features", "No Client Token", False, "Client login failed")
            return
        
        headers = {'Authorization': f'Bearer {self.tokens["client_premium"]}'}
        
        # Test user profile
        try:
            response = self.session.get(f"{API_BASE}/users/profile", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Client Features", "User Profile", True, 
                             f"User: {data.get('full_name', 'Unknown')}, Plan: {data.get('plan_type', 'Unknown')}")
            else:
                self.log_test("Client Features", "User Profile", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Client Features", "User Profile", False, "", str(e))
        
        # Test token generation
        try:
            response = self.session.post(f"{API_BASE}/tokens/generate-simple", 
                                       headers=headers, 
                                       params={'token_type': 'gym', 'validity_hours': 3},
                                       timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.test_data['generated_token'] = data.get('token_code')
                self.log_test("Client Features", "Token Generation", True, 
                             f"Token: {data.get('token_code', 'Unknown')[:8]}...")
            else:
                self.log_test("Client Features", "Token Generation", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Client Features", "Token Generation", False, "", str(e))
        
        # Test appointment limits
        try:
            response = self.session.get(f"{API_BASE}/appointments/monthly-limits", 
                                      headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Client Features", "Appointment Limits", True, 
                             f"Nutritionist: {data.get('nutritionist', 0)}, Personal: {data.get('personal', 0)}")
            else:
                self.log_test("Client Features", "Appointment Limits", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Client Features", "Appointment Limits", False, "", str(e))

    def test_professional_systems(self):
        """Test professional systems"""
        print("\n🏥 TESTING PROFESSIONAL SYSTEMS")
        print("=" * 50)
        
        # Test nutritionist system
        if 'nutritionist' in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens["nutritionist"]}'}
            
            # Test unassigned clients
            try:
                response = self.session.get(f"{API_BASE}/professionals/unassigned-clients", 
                                          headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    client_count = len(data) if isinstance(data, list) else 0
                    self.log_test("Professional Systems", "Nutritionist - Unassigned Clients", True, 
                                 f"Found {client_count} unassigned clients")
                else:
                    self.log_test("Professional Systems", "Nutritionist - Unassigned Clients", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Professional Systems", "Nutritionist - Unassigned Clients", False, "", str(e))
            
            # Test assigned clients
            try:
                response = self.session.get(f"{API_BASE}/professionals/my-assigned-clients", 
                                          headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    client_count = len(data) if isinstance(data, list) else 0
                    self.log_test("Professional Systems", "Nutritionist - Assigned Clients", True, 
                                 f"Has {client_count} assigned clients")
                else:
                    self.log_test("Professional Systems", "Nutritionist - Assigned Clients", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Professional Systems", "Nutritionist - Assigned Clients", False, "", str(e))
        
        # Test personal trainer system
        if 'personal_trainer' in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens["personal_trainer"]}'}
            
            # Test unassigned clients
            try:
                response = self.session.get(f"{API_BASE}/professionals/unassigned-clients", 
                                          headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    client_count = len(data) if isinstance(data, list) else 0
                    self.log_test("Professional Systems", "Personal Trainer - Unassigned Clients", True, 
                                 f"Found {client_count} unassigned clients")
                else:
                    self.log_test("Professional Systems", "Personal Trainer - Unassigned Clients", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Professional Systems", "Personal Trainer - Unassigned Clients", False, "", str(e))

    def test_gym_token_validation(self):
        """Test gym token validation system"""
        print("\n🏋️ TESTING GYM TOKEN VALIDATION")
        print("=" * 50)
        
        # Test token validation if we have a generated token
        if 'generated_token' in self.test_data:
            token_code = self.test_data['generated_token']
            
            try:
                response = self.session.post(f"{API_BASE}/tokens/validate/{token_code}",
                                           params={'gym_id': 'test-gym'}, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    user_info = data.get('user', {})
                    self.log_test("Gym Token Validation", "Token Validation", True, 
                                 f"Validated for user: {user_info.get('full_name', 'Unknown')}")
                else:
                    self.log_test("Gym Token Validation", "Token Validation", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Gym Token Validation", "Token Validation", False, "", str(e))
        else:
            self.log_test("Gym Token Validation", "Token Validation", False, 
                         "No token generated to validate")

    def test_payment_integration(self):
        """Test payment system integration"""
        print("\n💳 TESTING PAYMENT INTEGRATION")
        print("=" * 50)
        
        # Test payment plans endpoint
        try:
            response = self.session.get(f"{API_BASE}/payments/plans", timeout=10)
            if response.status_code == 200:
                data = response.json()
                plan_count = len(data) if isinstance(data, list) else 0
                
                # Verify pricing
                pricing_correct = True
                expected_plans = {
                    'basico': {'monthly_price': 99.90, 'activation_fee': 29.90},
                    'intermediario': {'monthly_price': 159.90, 'activation_fee': 59.90},
                    'vip': {'monthly_price': 349.90, 'activation_fee': 0.00}
                }
                
                for plan in data:
                    plan_id = plan.get('id')
                    if plan_id in expected_plans:
                        expected = expected_plans[plan_id]
                        if (plan.get('monthly_price') != expected['monthly_price'] or 
                            plan.get('activation_fee') != expected['activation_fee']):
                            pricing_correct = False
                            break
                
                self.log_test("Payment Integration", "Payment Plans", True, 
                             f"Found {plan_count} plans, Pricing correct: {pricing_correct}")
            else:
                self.log_test("Payment Integration", "Payment Plans", False, 
                             f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Payment Integration", "Payment Plans", False, "", str(e))
        
        # Test checkout session creation
        if 'client_premium' in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens["client_premium"]}'}
            checkout_data = {
                'plan_id': 'vip',
                'origin_url': 'https://test.com',
                'payment_method': 'stripe'
            }
            
            try:
                response = self.session.post(f"{API_BASE}/payments/checkout/session",
                                           json=checkout_data, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("Payment Integration", "Checkout Session", True, 
                                 f"Session ID: {data.get('session_id', 'Unknown')[:8]}...")
                else:
                    self.log_test("Payment Integration", "Checkout Session", False, 
                                 f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Payment Integration", "Checkout Session", False, "", str(e))

    def test_critical_workflows(self):
        """Test critical business workflows"""
        print("\n🔄 TESTING CRITICAL WORKFLOWS")
        print("=" * 50)
        
        # Test admin → gym creation → gym login workflow
        if 'admin' in self.tokens:
            headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
            
            # Create test gym
            timestamp = int(time.time())
            gym_data = {
                "name": f"Health Check Gym {timestamp}",
                "cnpj": f"99.999.{timestamp % 1000:03d}/0001-99",
                "email": f"healthcheck{timestamp}@test.com",
                "endereco": "Rua Health Check",
                "numero": "123",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567"
            }
            
            try:
                response = self.session.post(f"{API_BASE}/admin/gyms/register",
                                           json=gym_data, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    gym_login = data.get('login')
                    gym_password = data.get('password')
                    
                    # Test if created gym can login
                    gym_auth_response = self.session.post(f"{API_BASE}/gym/auth",
                                                        json={'username': gym_login, 'password': gym_password},
                                                        timeout=10)
                    
                    if gym_auth_response.status_code == 200:
                        self.log_test("Critical Workflows", "Admin → Gym Creation → Login", True, 
                                     f"Created gym {gym_data['name']} can login successfully")
                    else:
                        self.log_test("Critical Workflows", "Admin → Gym Creation → Login", False, 
                                     f"Created gym cannot login: {gym_auth_response.status_code}")
                else:
                    self.log_test("Critical Workflows", "Admin → Gym Creation → Login", False, 
                                 f"Gym creation failed: {response.status_code}")
            except Exception as e:
                self.log_test("Critical Workflows", "Admin → Gym Creation → Login", False, "", str(e))

    def test_performance_stability(self):
        """Test performance and stability"""
        print("\n⚡ TESTING PERFORMANCE & STABILITY")
        print("=" * 50)
        
        # Test response times
        start_time = time.time()
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200 and response_time < 2.0:
                self.log_test("Performance", "Health Endpoint Response Time", True, 
                             f"{response_time:.2f}s (< 2.0s)")
            else:
                self.log_test("Performance", "Health Endpoint Response Time", False, 
                             f"{response_time:.2f}s (>= 2.0s) or failed")
        except Exception as e:
            self.log_test("Performance", "Health Endpoint Response Time", False, "", str(e))
        
        # Test error handling
        try:
            response = self.session.post(f"{API_BASE}/auth/login",
                                       json={'email': 'invalid@test.com', 'password': 'wrong'},
                                       timeout=10)
            if response.status_code == 401:
                self.log_test("Performance", "Error Handling", True, 
                             "Invalid login properly rejected with 401")
            else:
                self.log_test("Performance", "Error Handling", False, 
                             f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Performance", "Error Handling", False, "", str(e))

    def run_comprehensive_health_check(self):
        """Run complete health check"""
        print("🚀 LUXEPASS COMPREHENSIVE DEPLOYMENT HEALTH CHECK")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 80)
        
        # Run all test suites
        self.test_core_backend_services()
        self.test_authentication_system()
        self.test_admin_panel_functionality()
        self.test_client_features()
        self.test_professional_systems()
        self.test_gym_token_validation()
        self.test_payment_integration()
        self.test_critical_workflows()
        self.test_performance_stability()
        
        # Generate report
        self.generate_deployment_report()

    def generate_deployment_report(self):
        """Generate deployment readiness report"""
        print("\n" + "=" * 80)
        print("🏥 DEPLOYMENT READINESS REPORT")
        print("=" * 80)
        
        # Calculate statistics
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determine deployment readiness
        deployment_ready = pass_rate >= 85  # 85% pass rate required
        
        status_emoji = "✅" if deployment_ready else "❌"
        print(f"\n{status_emoji} DEPLOYMENT READY: {deployment_ready}")
        print(f"📊 PASS RATE: {pass_rate:.1f}%")
        print(f"🧪 TESTS: {passed_tests}/{total_tests} passed")
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            category = result['category']
            if category not in categories:
                categories[category] = {'passed': 0, 'failed': 0, 'tests': []}
            
            if result['success']:
                categories[category]['passed'] += 1
            else:
                categories[category]['failed'] += 1
            categories[category]['tests'].append(result)
        
        # Print category summary
        print(f"\n📋 CATEGORY BREAKDOWN:")
        for category, stats in categories.items():
            total_cat = stats['passed'] + stats['failed']
            cat_rate = (stats['passed'] / total_cat * 100) if total_cat > 0 else 0
            status = "✅" if cat_rate >= 80 else "❌"
            print(f"   {status} {category}: {stats['passed']}/{total_cat} ({cat_rate:.1f}%)")
        
        # Print failed tests
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['category']} - {result['test']}")
                    if result['error']:
                        print(f"     Error: {result['error'][:100]}...")
        
        # Recommendations
        print(f"\n💡 DEPLOYMENT RECOMMENDATIONS:")
        if deployment_ready:
            print("   ✅ All critical systems operational - READY FOR DEPLOYMENT")
            print("   ✅ Authentication system working across all user types")
            print("   ✅ Core business workflows functional")
            print("   ✅ Payment integration operational")
        else:
            print("   ❌ DEPLOYMENT NOT RECOMMENDED - Critical issues found")
            if failed_tests > 0:
                print(f"   ❌ Fix {failed_tests} failing tests before deployment")
            
            # Specific recommendations based on failures
            failed_categories = [r['category'] for r in self.test_results if not r['success']]
            if 'Authentication' in failed_categories:
                print("   🔧 Fix authentication system issues")
            if 'Professional Systems' in failed_categories:
                print("   🔧 Resolve professional system API validation issues")
            if 'Payment Integration' in failed_categories:
                print("   🔧 Verify payment integration and pricing")
        
        print("\n" + "=" * 80)
        
        return {
            'deployment_ready': deployment_ready,
            'pass_rate': pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'categories': categories
        }

if __name__ == "__main__":
    checker = DeploymentHealthChecker()
    checker.run_comprehensive_health_check()
    
    # Calculate final result
    total_tests = len(checker.test_results)
    passed_tests = len([t for t in checker.test_results if t['success']])
    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    deployment_ready = pass_rate >= 85
    
    # Exit with appropriate code
    sys.exit(0 if deployment_ready else 1)