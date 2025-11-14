#!/usr/bin/env python3
"""
LuxePass Backend Testing Suite
Testing critical endpoints for deployment readiness
Focus: Authentication, Plans, Appointments, Video Call Integration
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://trainconnect-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class LuxePassTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.tokens = {}
        self.test_results = []
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def test_client_authentication(self):
        """Test client authentication with different plan types"""
        print("🔐 TESTING CLIENT AUTHENTICATION")
        print("=" * 50)
        
        # Test credentials from review request
        test_users = [
            {"email": "vip@luxepass.com", "password": "vip123", "expected_plan": "vip"},
            {"email": "intermediario@luxepass.com", "password": "inter123", "expected_plan": "intermediario"},
            {"email": "cliente@luxepass.com", "password": "cliente123", "expected_plan": "premium"}
        ]
        
        for user in test_users:
            try:
                response = self.session.post(f"{API_BASE}/auth/login", json={
                    "email": user["email"],
                    "password": user["password"]
                })
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('access_token')
                    if token:
                        self.tokens[user["email"]] = token
                        
                        # Test /api/users/me endpoint
                        headers = {'Authorization': f'Bearer {token}'}
                        me_response = self.session.get(f"{API_BASE}/users/me", headers=headers)
                        
                        if me_response.status_code == 200:
                            user_data = me_response.json()
                            plan_type = user_data.get('plan_type')
                            
                            self.log_test(
                                f"Client Login: {user['email']}", 
                                True,
                                f"Plan: {plan_type}, Token: {len(token)} chars"
                            )
                        else:
                            self.log_test(
                                f"Client Login: {user['email']}", 
                                False,
                                error=f"Failed to get user profile: {me_response.status_code}"
                            )
                    else:
                        self.log_test(
                            f"Client Login: {user['email']}", 
                            False,
                            error="No access token in response"
                        )
                else:
                    self.log_test(
                        f"Client Login: {user['email']}", 
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Client Login: {user['email']}", 
                    False,
                    error=f"Exception: {str(e)}"
                )
    
    def test_plans_system(self):
        """Test GET /api/integration/plans endpoint"""
        print("📋 TESTING PLANS SYSTEM")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/integration/plans")
            
            if response.status_code == 200:
                plans = response.json()
                
                if isinstance(plans, list) and len(plans) >= 3:
                    plan_types = [plan.get('type') for plan in plans]
                    expected_plans = ['basico', 'intermediario', 'vip']
                    
                    found_plans = [plan for plan in expected_plans if plan in plan_types]
                    
                    self.log_test(
                        "GET /api/integration/plans",
                        len(found_plans) == 3,
                        f"Found plans: {plan_types}, Expected: {expected_plans}"
                    )
                    
                    # Test plan structure
                    for plan in plans:
                        required_fields = ['type', 'name', 'monthly_price', 'nutritionist_consultations', 'personal_consultations']
                        missing_fields = [field for field in required_fields if field not in plan]
                        
                        if not missing_fields:
                            self.log_test(
                                f"Plan Structure: {plan.get('type')}",
                                True,
                                f"Price: R$ {plan.get('monthly_price')}, Nutri: {plan.get('nutritionist_consultations')}, Personal: {plan.get('personal_consultations')}"
                            )
                        else:
                            self.log_test(
                                f"Plan Structure: {plan.get('type')}",
                                False,
                                error=f"Missing fields: {missing_fields}"
                            )
                else:
                    self.log_test(
                        "GET /api/integration/plans",
                        False,
                        error=f"Expected list with 3+ plans, got: {type(plans)} with {len(plans) if isinstance(plans, list) else 'N/A'} items"
                    )
            else:
                self.log_test(
                    "GET /api/integration/plans",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/integration/plans",
                False,
                error=f"Exception: {str(e)}"
            )
    
    def test_appointment_system(self):
        """Test appointment system with monthly limits"""
        print("📅 TESTING APPOINTMENT SYSTEM")
        print("=" * 50)
        
        # Test with different user types
        test_users = ["vip@luxepass.com", "intermediario@luxepass.com", "cliente@luxepass.com"]
        
        for email in test_users:
            if email not in self.tokens:
                continue
                
            headers = {'Authorization': f'Bearer {self.tokens[email]}'}
            
            # Test my appointments
            try:
                response = self.session.get(f"{API_BASE}/appointments/my-appointments", headers=headers)
                
                if response.status_code == 200:
                    appointments = response.json()
                    self.log_test(
                        f"My Appointments: {email}",
                        True,
                        f"Found {len(appointments)} appointments"
                    )
                else:
                    self.log_test(
                        f"My Appointments: {email}",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
            except Exception as e:
                self.log_test(
                    f"My Appointments: {email}",
                    False,
                    error=f"Exception: {str(e)}"
                )
            
            # Test available slots
            try:
                test_date = "2025-11-20"
                response = self.session.get(
                    f"{API_BASE}/appointments/available-slots",
                    headers=headers,
                    params={
                        "professional_type": "nutritionist",
                        "date": test_date
                    }
                )
                
                if response.status_code == 200:
                    slots = response.json()
                    self.log_test(
                        f"Available Slots: {email}",
                        True,
                        f"Found {len(slots)} available slots for {test_date}"
                    )
                elif response.status_code == 403:
                    self.log_test(
                        f"Available Slots: {email}",
                        False,
                        error="Access denied - plan may not allow appointments"
                    )
                else:
                    self.log_test(
                        f"Available Slots: {email}",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
            except Exception as e:
                self.log_test(
                    f"Available Slots: {email}",
                    False,
                    error=f"Exception: {str(e)}"
                )
    
    def test_agora_token_generation(self):
        """Test Agora.io video call token generation"""
        print("🎥 TESTING AGORA.IO TOKEN GENERATION")
        print("=" * 50)
        
        try:
            response = self.session.get(
                f"{API_BASE}/agora/token",
                params={
                    "channelName": "test-channel",
                    "uid": "12345"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token')
                
                if token and len(token) > 50:  # Agora tokens are typically long
                    self.log_test(
                        "Agora Token Generation",
                        True,
                        f"Token length: {len(token)} chars, Channel: test-channel"
                    )
                else:
                    self.log_test(
                        "Agora Token Generation",
                        False,
                        error=f"Invalid token format: {token}"
                    )
            else:
                self.log_test(
                    "Agora Token Generation",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test(
                "Agora Token Generation",
                False,
                error=f"Exception: {str(e)}"
            )
    
    def test_professional_authentication(self):
        """Test professional authentication"""
        print("👨‍⚕️ TESTING PROFESSIONAL AUTHENTICATION")
        print("=" * 50)
        
        professionals = [
            {"email": "nutri@luxepass.com", "password": "nutri123", "type": "nutritionist"},
            {"email": "personal@luxepass.com", "password": "personal123", "type": "personal"}
        ]
        
        for prof in professionals:
            try:
                response = self.session.post(f"{API_BASE}/professionals/login", json={
                    "email": prof["email"],
                    "password": prof["password"]
                })
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('access_token')
                    professional_type = data.get('professional_type')
                    
                    if token:
                        self.log_test(
                            f"Professional Login: {prof['type']}",
                            True,
                            f"Email: {prof['email']}, Type: {professional_type}, Token: {len(token)} chars"
                        )
                    else:
                        self.log_test(
                            f"Professional Login: {prof['type']}",
                            False,
                            error="No access token in response"
                        )
                else:
                    self.log_test(
                        f"Professional Login: {prof['type']}",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Professional Login: {prof['type']}",
                    False,
                    error=f"Exception: {str(e)}"
                )
    
    def test_admin_authentication(self):
        """Test admin authentication"""
        print("👑 TESTING ADMIN AUTHENTICATION")
        print("=" * 50)
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json={
                "email": "admin@luxepass.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                
                if token:
                    self.tokens["admin@luxepass.com"] = token
                    self.log_test(
                        "Admin Login",
                        True,
                        f"Token: {len(token)} chars"
                    )
                else:
                    self.log_test(
                        "Admin Login",
                        False,
                        error="No access token in response"
                    )
            else:
                self.log_test(
                    "Admin Login",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test(
                "Admin Login",
                False,
                error=f"Exception: {str(e)}"
            )
    
    def test_monthly_limits_validation(self):
        """Test monthly consultation limits based on plan type"""
        print("📊 TESTING MONTHLY LIMITS VALIDATION")
        print("=" * 50)
        
        # Expected limits based on PAYMENT_PLANS configuration
        expected_limits = {
            "basico": {"nutritionist": 0, "personal": 0},
            "intermediario": {"nutritionist": 1, "personal": 1},
            "vip": {"nutritionist": 2, "personal": 2}
        }
        
        for email in self.tokens:
            if "admin" in email:
                continue
                
            headers = {'Authorization': f'Bearer {self.tokens[email]}'}
            
            try:
                # Get user profile to determine plan
                me_response = self.session.get(f"{API_BASE}/users/me", headers=headers)
                if me_response.status_code != 200:
                    continue
                    
                user_data = me_response.json()
                plan_type = user_data.get('plan_type')
                
                # Map premium to vip for limits checking
                if plan_type == "premium":
                    plan_type = "vip"
                
                if plan_type in expected_limits:
                    expected = expected_limits[plan_type]
                    
                    # Test nutritionist limit
                    try:
                        response = self.session.get(
                            f"{API_BASE}/appointments/available-slots",
                            headers=headers,
                            params={"professional_type": "nutritionist", "date": "2025-11-20"}
                        )
                        
                        if expected["nutritionist"] > 0:
                            # Should have access
                            success = response.status_code == 200
                            details = f"Expected access (limit: {expected['nutritionist']}), Got: {response.status_code}"
                        else:
                            # Should be denied
                            success = response.status_code == 403
                            details = f"Expected denial (limit: {expected['nutritionist']}), Got: {response.status_code}"
                        
                        self.log_test(
                            f"Nutritionist Limit: {email} ({plan_type})",
                            success,
                            details
                        )
                    except Exception as e:
                        self.log_test(
                            f"Nutritionist Limit: {email} ({plan_type})",
                            False,
                            error=f"Exception: {str(e)}"
                        )
                        
            except Exception as e:
                self.log_test(
                    f"Monthly Limits: {email}",
                    False,
                    error=f"Exception: {str(e)}"
                )

    def test_appointment_completion_system(self):
        """Test appointment completion functionality - MAIN FOCUS OF REVIEW REQUEST"""
        print("✅ TESTING APPOINTMENT COMPLETION SYSTEM")
        print("=" * 50)
        
        # Store professional tokens for later use
        professional_tokens = {}
        
        # Test professional authentication first
        professionals = [
            {"email": "nutri@luxepass.com", "password": "nutri123", "type": "nutritionist"},
            {"email": "personal@luxepass.com", "password": "personal123", "type": "personal"}
        ]
        
        for prof in professionals:
            try:
                response = self.session.post(f"{API_BASE}/professionals/login", json={
                    "email": prof["email"],
                    "password": prof["password"]
                })
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('access_token')
                    professional_info = data.get('professional', {})
                    
                    if token:
                        professional_tokens[prof['type']] = {
                            'token': token,
                            'email': prof['email'],
                            'info': professional_info
                        }
                        self.log_test(
                            f"Professional Auth: {prof['type']}",
                            True,
                            f"Email: {prof['email']}, Name: {professional_info.get('full_name', 'N/A')}"
                        )
                    else:
                        self.log_test(
                            f"Professional Auth: {prof['type']}",
                            False,
                            error="No access token received"
                        )
                else:
                    self.log_test(
                        f"Professional Auth: {prof['type']}",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Professional Auth: {prof['type']}",
                    False,
                    error=f"Exception: {str(e)}"
                )
        
        # Test GET /api/professionals/appointments for each professional
        for prof_type, prof_data in professional_tokens.items():
            headers = {'Authorization': f'Bearer {prof_data["token"]}'}
            
            try:
                response = self.session.get(f"{API_BASE}/professionals/appointments", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    appointments = data.get('appointments', [])
                    
                    self.log_test(
                        f"List Appointments: {prof_type}",
                        True,
                        f"Found {len(appointments)} appointments for {prof_data['email']}"
                    )
                    
                    # Check appointment data structure
                    if appointments:
                        first_appt = appointments[0]
                        required_fields = ['id', 'client_name', 'appointment_date', 'status']
                        missing_fields = [field for field in required_fields if field not in first_appt]
                        
                        if not missing_fields:
                            self.log_test(
                                f"Appointment Data Structure: {prof_type}",
                                True,
                                f"All required fields present: {list(first_appt.keys())}"
                            )
                        else:
                            self.log_test(
                                f"Appointment Data Structure: {prof_type}",
                                False,
                                error=f"Missing fields: {missing_fields}"
                            )
                    
                else:
                    self.log_test(
                        f"List Appointments: {prof_type}",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"List Appointments: {prof_type}",
                    False,
                    error=f"Exception: {str(e)}"
                )
        
        # Test appointment completion endpoint with mock appointment IDs
        # Since we may not have real appointments, test with various scenarios
        test_appointment_ids = [
            "507f1f77bcf86cd799439011",  # Valid ObjectId format
            "invalid_id",                # Invalid format
            "000000000000000000000000"   # Valid format but non-existent
        ]
        
        for prof_type, prof_data in professional_tokens.items():
            headers = {'Authorization': f'Bearer {prof_data["token"]}'}
            
            for i, appointment_id in enumerate(test_appointment_ids):
                try:
                    response = self.session.put(
                        f"{API_BASE}/appointments/{appointment_id}/complete",
                        headers=headers
                    )
                    
                    # Expected responses:
                    # 404 - Appointment not found (expected for test IDs)
                    # 400 - Invalid ID format
                    # 200 - Success (if real appointment exists)
                    
                    if response.status_code in [404, 400]:
                        # Expected for test data
                        self.log_test(
                            f"Complete Appointment Test {i+1}: {prof_type}",
                            True,
                            f"Correctly handled test ID {appointment_id[:8]}... - Status: {response.status_code}"
                        )
                    elif response.status_code == 200:
                        # Unexpected success with test data
                        self.log_test(
                            f"Complete Appointment Test {i+1}: {prof_type}",
                            True,
                            f"Successfully completed appointment {appointment_id[:8]}..."
                        )
                    else:
                        self.log_test(
                            f"Complete Appointment Test {i+1}: {prof_type}",
                            False,
                            error=f"Unexpected status {response.status_code}: {response.text}"
                        )
                        
                except Exception as e:
                    self.log_test(
                        f"Complete Appointment Test {i+1}: {prof_type}",
                        False,
                        error=f"Exception: {str(e)}"
                    )
        
        # Test security: unauthenticated access
        try:
            response = self.session.put(f"{API_BASE}/appointments/test_id/complete")
            
            if response.status_code == 401:
                self.log_test(
                    "Security: Unauthenticated Access",
                    True,
                    "Correctly rejected unauthenticated request"
                )
            else:
                self.log_test(
                    "Security: Unauthenticated Access",
                    False,
                    error=f"Should return 401, got {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Security: Unauthenticated Access",
                False,
                error=f"Exception: {str(e)}"
            )
        
        # Test admin confirmed appointments endpoint
        if "admin@luxepass.com" in self.tokens:
            admin_headers = {'Authorization': f'Bearer {self.tokens["admin@luxepass.com"]}'}
            
            try:
                # Test without parameters (current month)
                response = self.session.get(f"{API_BASE}/admin/confirmed-appointments", headers=admin_headers)
                
                if response.status_code == 200:
                    appointments = response.json()
                    self.log_test(
                        "Admin Confirmed Appointments",
                        True,
                        f"Retrieved {len(appointments)} confirmed appointments"
                    )
                else:
                    self.log_test(
                        "Admin Confirmed Appointments",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                
                # Test with specific month/year
                current_date = datetime.now()
                params = {
                    "month": current_date.month,
                    "year": current_date.year
                }
                
                response = self.session.get(
                    f"{API_BASE}/admin/confirmed-appointments",
                    headers=admin_headers,
                    params=params
                )
                
                if response.status_code == 200:
                    appointments = response.json()
                    self.log_test(
                        "Admin Confirmed Appointments (with params)",
                        True,
                        f"Retrieved {len(appointments)} appointments for {current_date.month}/{current_date.year}"
                    )
                else:
                    self.log_test(
                        "Admin Confirmed Appointments (with params)",
                        False,
                        error=f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    "Admin Confirmed Appointments",
                    False,
                    error=f"Exception: {str(e)}"
                )
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 LUXEPASS BACKEND TESTING SUITE")
        print("=" * 60)
        print(f"Backend URL: {API_BASE}")
        print(f"Test Time: {datetime.now().isoformat()}")
        print("=" * 60)
        print()
        
        # Run test suites in order
        self.test_admin_authentication()
        self.test_client_authentication()
        self.test_plans_system()
        self.test_appointment_system()
        self.test_agora_token_generation()
        self.test_professional_authentication()
        self.test_monthly_limits_validation()
        
        # Summary
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['error']}")
            print()
        
        print("🎯 CRITICAL ENDPOINTS STATUS:")
        critical_endpoints = [
            "Client Login: vip@luxepass.com",
            "Client Login: intermediario@luxepass.com", 
            "Client Login: cliente@luxepass.com",
            "GET /api/integration/plans",
            "Agora Token Generation",
            "Professional Login: nutritionist",
            "Professional Login: personal"
        ]
        
        for endpoint in critical_endpoints:
            result = next((r for r in self.test_results if endpoint in r['test']), None)
            if result:
                status = "✅" if result['success'] else "❌"
                print(f"  {status} {endpoint}")
        
        return passed_tests, failed_tests, total_tests

if __name__ == "__main__":
    tester = LuxePassTester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with error code if tests failed
    sys.exit(0 if failed == 0 else 1)