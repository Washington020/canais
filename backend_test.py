#!/usr/bin/env python3
"""
LuxePass Admin System Backend Testing
Focus: Dashboard and Professional Management Endpoints
"""

import requests
import json
import sys
from datetime import datetime
import os

# Get backend URL from environment
BACKEND_URL = "https://trainer-client-app-4.preview.emergentagent.com/api"

class LuxePassAdminTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.admin_token = None
        self.professional_tokens = {}
        self.test_results = []
        self.created_professionals = []
        
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
    
    def test_admin_authentication(self):
        """Test admin login with admin@luxepass.com/admin123"""
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={
                "email": "admin@luxepass.com",
                "password": "admin123"
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.log_test("Admin Authentication", True, 
                                f"Successfully logged in as admin, token length: {len(self.admin_token)}")
                    return True
                else:
                    self.log_test("Admin Authentication", False, 
                                error="No access_token in response")
                    return False
            else:
                self.log_test("Admin Authentication", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, error=str(e))
            return False
    
    def test_dashboard_stats(self):
        """Test GET /api/admin/dashboard/stats"""
        if not self.admin_token:
            self.log_test("Dashboard Stats", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/dashboard/stats", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Dashboard Stats", True, 
                            f"Retrieved stats: {json.dumps(data, indent=2)}")
                return True
            else:
                self.log_test("Dashboard Stats", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Stats", False, error=str(e))
            return False
    
    def test_dashboard_recent_users(self):
        """Test GET /api/admin/dashboard/recent-users?limit=5"""
        if not self.admin_token:
            self.log_test("Dashboard Recent Users", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/dashboard/recent-users?limit=5", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                user_count = len(data) if isinstance(data, list) else len(data.get('users', []))
                self.log_test("Dashboard Recent Users", True, 
                            f"Retrieved {user_count} recent users")
                return True
            else:
                self.log_test("Dashboard Recent Users", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Recent Users", False, error=str(e))
            return False
    
    def test_dashboard_gym_performance(self):
        """Test GET /api/admin/dashboard/gym-performance?limit=5"""
        if not self.admin_token:
            self.log_test("Dashboard Gym Performance", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/dashboard/gym-performance?limit=5", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Dashboard Gym Performance", True, 
                            f"Retrieved gym performance data: {json.dumps(data, default=str)}")
                return True
            else:
                self.log_test("Dashboard Gym Performance", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Gym Performance", False, error=str(e))
            return False
    
    def test_dashboard_recent_tokens(self):
        """Test GET /api/admin/dashboard/recent-tokens?limit=5"""
        if not self.admin_token:
            self.log_test("Dashboard Recent Tokens", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/dashboard/recent-tokens?limit=5", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Dashboard Recent Tokens", True, 
                            f"Retrieved recent tokens data: {json.dumps(data, default=str)}")
                return True
            else:
                self.log_test("Dashboard Recent Tokens", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Recent Tokens", False, error=str(e))
            return False
    
    def test_dashboard_appointments(self):
        """Test GET /api/admin/dashboard/appointments?limit=10"""
        if not self.admin_token:
            self.log_test("Dashboard Appointments", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/dashboard/appointments?limit=10", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Dashboard Appointments", True, 
                            f"Retrieved appointments data: {json.dumps(data, default=str)}")
                return True
            else:
                self.log_test("Dashboard Appointments", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Appointments", False, error=str(e))
            return False
    
    def test_get_professionals(self):
        """Test GET /api/admin/professionals"""
        if not self.admin_token:
            self.log_test("Get Professionals", False, error="No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/admin/professionals", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                professionals = data.get('professionals', data) if isinstance(data, dict) else data
                prof_count = len(professionals) if isinstance(professionals, list) else 0
                self.log_test("Get Professionals", True, 
                            f"Retrieved {prof_count} existing professionals")
                return True
            else:
                self.log_test("Get Professionals", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Professionals", False, error=str(e))
            return False
    
    def test_create_personal_trainer(self):
        """Test POST /api/admin/professionals - Create Personal Trainer"""
        if not self.admin_token:
            self.log_test("Create Personal Trainer", False, error="No admin token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            # Use unique email to avoid conflicts
            import time
            unique_id = int(time.time()) % 10000
            
            professional_data = {
                "full_name": "Prof. Carlos Silva Novo",
                "email": f"carlos_novo_{unique_id}@luxepass.com",
                "password": "carlos123",
                "professional_type": "personal",
                "cref_crn": "CREF-123456/SP",
                "specialization": "Musculação e Condicionamento Físico",
                "phone": "(11) 99999-1234",
                "experience_years": 8,
                "bio": "Personal trainer especializado em musculação"
            }
            
            response = requests.post(f"{self.base_url}/admin/professionals", 
                                   headers=headers, json=professional_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.created_professionals.append({
                        "email": professional_data["email"],
                        "password": "carlos123",
                        "type": "personal"
                    })
                    self.log_test("Create Personal Trainer", True, 
                                f"Successfully created: {data.get('message', 'Personal trainer created')}")
                    return True
                else:
                    self.log_test("Create Personal Trainer", False, 
                                error=f"Success=False: {data}")
                    return False
            else:
                self.log_test("Create Personal Trainer", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Personal Trainer", False, error=str(e))
            return False
    
    def test_create_nutritionist(self):
        """Test POST /api/admin/professionals - Create Nutritionist"""
        if not self.admin_token:
            self.log_test("Create Nutritionist", False, error="No admin token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            # Use unique email to avoid conflicts
            import time
            unique_id = int(time.time()) % 10000
            
            professional_data = {
                "full_name": "Dra. Ana Santos Nova",
                "email": f"ana_nova_{unique_id}@luxepass.com",
                "password": "ana123",
                "professional_type": "nutritionist",
                "cref_crn": "CRN-123456/SP",
                "specialization": "Nutrição Esportiva",
                "phone": "(11) 99999-5678",
                "experience_years": 5,
                "bio": "Nutricionista especializada em nutrição esportiva"
            }
            
            response = requests.post(f"{self.base_url}/admin/professionals", 
                                   headers=headers, json=professional_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.created_professionals.append({
                        "email": professional_data["email"],
                        "password": "ana123",
                        "type": "nutritionist"
                    })
                    self.log_test("Create Nutritionist", True, 
                                f"Successfully created: {data.get('message', 'Nutritionist created')}")
                    return True
                else:
                    self.log_test("Create Nutritionist", False, 
                                error=f"Success=False: {data}")
                    return False
            else:
                self.log_test("Create Nutritionist", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Nutritionist", False, error=str(e))
            return False
    
    def test_professional_login(self, email, password, prof_type):
        """Test professional login"""
        try:
            response = requests.post(f"{self.base_url}/professionals/login", json={
                "email": email,
                "password": password
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.professional_tokens[email] = data["access_token"]
                    self.log_test(f"Professional Login ({prof_type})", True, 
                                f"Successfully logged in {email}")
                    return True
                else:
                    self.log_test(f"Professional Login ({prof_type})", False, 
                                error="No access_token in response")
                    return False
            else:
                self.log_test(f"Professional Login ({prof_type})", False, 
                            error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"Professional Login ({prof_type})", False, error=str(e))
            return False
    
    def test_existing_professional_logins(self):
        """Test login for existing professionals from review request"""
        existing_professionals = [
            {"email": "carlos@luxepass.com", "password": "carlos123", "type": "personal"},
            {"email": "ana@luxepass.com", "password": "ana123", "type": "nutritionist"}
        ]
        
        success_count = 0
        for prof in existing_professionals:
            if self.test_professional_login(prof["email"], prof["password"], prof["type"]):
                success_count += 1
        
        return success_count == len(existing_professionals)
    
    def test_professional_logins(self):
        """Test login for all created professionals"""
        success_count = 0
        for prof in self.created_professionals:
            if self.test_professional_login(prof["email"], prof["password"], prof["type"]):
                success_count += 1
        
        return success_count == len(self.created_professionals)
    
    def test_validation_errors(self):
        """Test validation errors for professional creation"""
        if not self.admin_token:
            self.log_test("Validation Errors Test", False, error="No admin token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            # Test with missing required fields
            incomplete_data = {
                "full_name": "Test Professional",
                # Missing email, password, professional_type, etc.
            }
            
            response = requests.post(f"{self.base_url}/admin/professionals", 
                                   headers=headers, json=incomplete_data, timeout=10)
            
            if response.status_code in [400, 422]:  # Validation error expected
                self.log_test("Validation Errors Test", True, 
                            f"Correctly returned validation error: Status {response.status_code}")
                return True
            else:
                self.log_test("Validation Errors Test", False, 
                            error=f"Expected validation error but got status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Validation Errors Test", False, error=str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting LuxePass Admin System Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Admin Authentication
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.generate_summary()
        
        # Test 2: Dashboard Endpoints (High Priority)
        print("📊 Testing Dashboard Endpoints...")
        self.test_dashboard_stats()
        self.test_dashboard_recent_users()
        self.test_dashboard_gym_performance()
        self.test_dashboard_recent_tokens()
        self.test_dashboard_appointments()
        
        # Test 3: Professional Management Endpoints (High Priority)
        print("👥 Testing Professional Management...")
        self.test_get_professionals()
        self.test_create_personal_trainer()
        self.test_create_nutritionist()
        
        # Test 4: Professional Login Access
        print("🔐 Testing Professional Login Access...")
        self.test_professional_logins()
        
        # Test 5: Error Handling
        print("⚠️ Testing Error Handling...")
        self.test_validation_errors()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print("=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['error']}")
            print()
        
        if self.created_professionals:
            print("👥 CREATED PROFESSIONALS:")
            for prof in self.created_professionals:
                print(f"  • {prof['email']} ({prof['type']}) - Password: {prof['password']}")
            print()
        
        print("🎯 FOCUS AREAS FROM REVIEW REQUEST:")
        dashboard_tests = [r for r in self.test_results if "Dashboard" in r["test"]]
        dashboard_passed = sum(1 for r in dashboard_tests if r["success"])
        print(f"  • Dashboard Endpoints: {dashboard_passed}/{len(dashboard_tests)} working")
        
        prof_tests = [r for r in self.test_results if "Professional" in r["test"] or "Create" in r["test"]]
        prof_passed = sum(1 for r in prof_tests if r["success"])
        print(f"  • Professional Management: {prof_passed}/{len(prof_tests)} working")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": (passed_tests/total_tests)*100,
            "dashboard_working": dashboard_passed == len(dashboard_tests),
            "professional_management_working": prof_passed == len(prof_tests),
            "created_professionals": self.created_professionals,
            "failed_tests": [r for r in self.test_results if not r["success"]]
        }

def main():
    """Main test execution"""
    tester = LuxePassAdminTester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    if summary["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()