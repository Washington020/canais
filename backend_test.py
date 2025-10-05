#!/usr/bin/env python3
"""
LuxePass Appointment System Backend Testing - VERIFICATION FOCUS
Quick verification test of the fixed appointment system endpoints.
Testing: Premium plan support, date format fixes, available slots access
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://trainer-client-app-4.preview.emergentagent.com/api"

# Test credentials as specified in review request
TEST_USERS = {
    "premium_user": {
        "email": "cliente@luxepass.com",
        "password": "cliente123",
        "expected_plan": "premium",
        "expected_limits": {"nutritionist": 2, "personal": 2}  # Should work like VIP
    },
    "intermediario_user": {
        "email": "intermediario@luxepass.com", 
        "password": "inter123",
        "expected_plan": "intermediario",
        "expected_limits": {"nutritionist": 1, "personal": 1}
    }
}

class AppointmentSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.tokens = {}
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_data and not success:
            print(f"    Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def authenticate_user(self, user_key: str) -> bool:
        """Authenticate user and store token"""
        try:
            user_data = TEST_USERS[user_key]
            
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            
            if response.status_code == 200:
                data = response.json()
                self.tokens[user_key] = data["access_token"]
                self.log_test(f"Authentication - {user_key}", True, f"Successfully authenticated {user_data['email']}")
                return True
            else:
                self.log_test(f"Authentication - {user_key}", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"Authentication - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def get_auth_headers(self, user_key: str) -> Dict[str, str]:
        """Get authorization headers for user"""
        return {
            'Authorization': f'Bearer {self.tokens[user_key]}',
            'Content-Type': 'application/json'
        }
    
    def test_monthly_limits_endpoint(self, user_key: str) -> bool:
        """Test GET /api/appointments/monthly-limits"""
        try:
            headers = self.get_auth_headers(user_key)
            response = self.session.get(f"{BASE_URL}/appointments/monthly-limits", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                user_data = TEST_USERS[user_key]
                
                # Verify response structure
                required_fields = ["plan_type", "limits", "usage", "remaining"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(f"Monthly Limits - {user_key}", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Verify plan type
                if data["plan_type"] != user_data["expected_plan"]:
                    self.log_test(f"Monthly Limits - {user_key}", False, f"Expected plan {user_data['expected_plan']}, got {data['plan_type']}", data)
                    return False
                
                # Verify limits
                expected_limits = user_data["expected_limits"]
                actual_limits = data["limits"]
                
                if actual_limits != expected_limits:
                    self.log_test(f"Monthly Limits - {user_key}", False, f"Expected limits {expected_limits}, got {actual_limits}", data)
                    return False
                
                self.log_test(f"Monthly Limits - {user_key}", True, f"Plan: {data['plan_type']}, Limits: {data['limits']}, Usage: {data['usage']}, Remaining: {data['remaining']}")
                return True
            else:
                self.log_test(f"Monthly Limits - {user_key}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"Monthly Limits - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def test_my_appointments_endpoint(self, user_key: str) -> bool:
        """Test GET /api/appointments/my-appointments"""
        try:
            headers = self.get_auth_headers(user_key)
            response = self.session.get(f"{BASE_URL}/appointments/my-appointments", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "appointments" not in data:
                    self.log_test(f"My Appointments - {user_key}", False, "Missing 'appointments' field", data)
                    return False
                
                appointments = data["appointments"]
                
                # Check can_cancel field for scheduled appointments
                for apt in appointments:
                    if apt.get("status") == "scheduled":
                        if "can_cancel" not in apt:
                            self.log_test(f"My Appointments - {user_key}", False, "Missing 'can_cancel' field in scheduled appointment", apt)
                            return False
                
                self.log_test(f"My Appointments - {user_key}", True, f"Retrieved {len(appointments)} appointments")
                return True
            else:
                self.log_test(f"My Appointments - {user_key}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"My Appointments - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def test_available_slots_endpoint(self, user_key: str) -> bool:
        """Test GET /api/appointments/available-slots"""
        try:
            headers = self.get_auth_headers(user_key)
            
            # Test with nutritionist
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            response = self.session.get(
                f"{BASE_URL}/appointments/available-slots",
                headers=headers,
                params={
                    "professional_type": "nutritionist",
                    "date": tomorrow
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "available_slots" not in data:
                    self.log_test(f"Available Slots - {user_key} (nutritionist)", False, "Missing 'available_slots' field", data)
                    return False
                
                self.log_test(f"Available Slots - {user_key} (nutritionist)", True, f"Retrieved {len(data['available_slots'])} slots for {tomorrow}")
                
                # Test with personal trainer
                response = self.session.get(
                    f"{BASE_URL}/appointments/available-slots",
                    headers=headers,
                    params={
                        "professional_type": "personal",
                        "date": tomorrow
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Available Slots - {user_key} (personal)", True, f"Retrieved {len(data['available_slots'])} slots for {tomorrow}")
                    return True
                else:
                    self.log_test(f"Available Slots - {user_key} (personal)", False, f"HTTP {response.status_code}", response.text)
                    return False
                    
            elif response.status_code == 403:
                # Expected for basic users
                user_data = TEST_USERS[user_key]
                if user_data["expected_plan"] == "basic":
                    self.log_test(f"Available Slots - {user_key}", True, "Correctly blocked basic user (403)")
                    return True
                else:
                    self.log_test(f"Available Slots - {user_key}", False, f"Unexpected 403 for {user_data['expected_plan']} user", response.text)
                    return False
            else:
                self.log_test(f"Available Slots - {user_key}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"Available Slots - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def test_appointment_booking(self, user_key: str) -> Optional[str]:
        """Test POST /api/appointments/book - returns appointment_id if successful"""
        try:
            headers = self.get_auth_headers(user_key)
            
            # Create test appointment data
            tomorrow = datetime.now() + timedelta(days=2)  # Book for day after tomorrow
            appointment_data = {
                "professional_type": "nutritionist",
                "professional_id": "test_nutritionist_id",
                "appointment_date": tomorrow.isoformat(),
                "appointment_time": "10:00",
                "notes": "Test appointment booking"
            }
            
            response = self.session.post(
                f"{BASE_URL}/appointments/book",
                headers=headers,
                json=appointment_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "appointment_id" not in data:
                    self.log_test(f"Book Appointment - {user_key}", False, "Missing 'appointment_id' field", data)
                    return None
                
                appointment_id = data["appointment_id"]
                self.log_test(f"Book Appointment - {user_key}", True, f"Successfully booked appointment {appointment_id}")
                return appointment_id
                
            elif response.status_code == 400:
                # Could be monthly limit reached or slot unavailable
                error_msg = response.json().get("detail", response.text)
                if "limite" in error_msg.lower() or "limit" in error_msg.lower():
                    self.log_test(f"Book Appointment - {user_key}", True, f"Monthly limit enforced: {error_msg}")
                    return None
                else:
                    self.log_test(f"Book Appointment - {user_key}", False, f"Booking failed: {error_msg}")
                    return None
                    
            elif response.status_code == 403:
                # Expected for basic users
                self.log_test(f"Book Appointment - {user_key}", True, "Correctly blocked unauthorized user (403)")
                return None
            else:
                self.log_test(f"Book Appointment - {user_key}", False, f"HTTP {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test(f"Book Appointment - {user_key}", False, f"Exception: {str(e)}")
            return None
    
    def test_appointment_cancellation(self, user_key: str, appointment_id: str) -> bool:
        """Test DELETE /api/appointments/{appointment_id}/cancel"""
        try:
            headers = self.get_auth_headers(user_key)
            
            response = self.session.delete(
                f"{BASE_URL}/appointments/{appointment_id}/cancel",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get("success"):
                    self.log_test(f"Cancel Appointment - {user_key}", False, "Success field is False", data)
                    return False
                
                self.log_test(f"Cancel Appointment - {user_key}", True, f"Successfully cancelled appointment {appointment_id}")
                return True
                
            elif response.status_code == 400:
                # Could be 24h restriction
                error_msg = response.json().get("detail", response.text)
                if "24" in error_msg:
                    self.log_test(f"Cancel Appointment - {user_key}", True, f"24h restriction enforced: {error_msg}")
                    return True
                else:
                    self.log_test(f"Cancel Appointment - {user_key}", False, f"Cancellation failed: {error_msg}")
                    return False
                    
            elif response.status_code == 404:
                self.log_test(f"Cancel Appointment - {user_key}", False, "Appointment not found", response.text)
                return False
            else:
                self.log_test(f"Cancel Appointment - {user_key}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"Cancel Appointment - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def test_invalid_appointment_cancellation(self, user_key: str) -> bool:
        """Test cancellation with invalid appointment ID"""
        try:
            headers = self.get_auth_headers(user_key)
            fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
            
            response = self.session.delete(
                f"{BASE_URL}/appointments/{fake_id}/cancel",
                headers=headers
            )
            
            if response.status_code == 404:
                self.log_test(f"Cancel Invalid Appointment - {user_key}", True, "Correctly returned 404 for invalid appointment ID")
                return True
            else:
                self.log_test(f"Cancel Invalid Appointment - {user_key}", False, f"Expected 404, got {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(f"Cancel Invalid Appointment - {user_key}", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_test(self):
        """Run all appointment system tests"""
        print("🎯 LUXEPASS APPOINTMENT SYSTEM TESTING STARTED")
        print("=" * 60)
        print()
        
        # Test authentication for both users
        print("📋 AUTHENTICATION TESTS")
        print("-" * 30)
        vip_auth = self.authenticate_user("vip_user")
        intermediario_auth = self.authenticate_user("intermediario_user")
        
        if not vip_auth or not intermediario_auth:
            print("❌ Authentication failed. Cannot proceed with appointment tests.")
            return False
        
        # Test monthly limits endpoint
        print("📊 MONTHLY LIMITS TESTS")
        print("-" * 30)
        self.test_monthly_limits_endpoint("vip_user")
        self.test_monthly_limits_endpoint("intermediario_user")
        
        # Test my appointments endpoint
        print("📅 MY APPOINTMENTS TESTS")
        print("-" * 30)
        self.test_my_appointments_endpoint("vip_user")
        self.test_my_appointments_endpoint("intermediario_user")
        
        # Test available slots endpoint
        print("🕐 AVAILABLE SLOTS TESTS")
        print("-" * 30)
        self.test_available_slots_endpoint("vip_user")
        self.test_available_slots_endpoint("intermediario_user")
        
        # Test appointment booking
        print("📝 APPOINTMENT BOOKING TESTS")
        print("-" * 30)
        vip_appointment_id = self.test_appointment_booking("vip_user")
        intermediario_appointment_id = self.test_appointment_booking("intermediario_user")
        
        # Test appointment cancellation
        print("❌ APPOINTMENT CANCELLATION TESTS")
        print("-" * 30)
        
        # Test invalid appointment cancellation
        self.test_invalid_appointment_cancellation("vip_user")
        self.test_invalid_appointment_cancellation("intermediario_user")
        
        # Test valid appointment cancellation if we have appointment IDs
        if vip_appointment_id:
            self.test_appointment_cancellation("vip_user", vip_appointment_id)
        
        if intermediario_appointment_id:
            self.test_appointment_cancellation("intermediario_user", intermediario_appointment_id)
        
        # Summary
        print("📈 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        # Report critical backend issues found
        print("\n🚨 CRITICAL BACKEND ISSUES IDENTIFIED:")
        print("-" * 50)
        print("1. PLAN TYPE MISMATCH: cliente@luxepass.com has 'premium' plan but appointment")
        print("   system only supports 'vip' and 'intermediario' plans")
        print("2. MONTHLY LIMITS BUG: Premium plan gets 0 limits instead of VIP-equivalent limits")
        print("3. DATE FORMAT ERROR: Invalid isoformat string in my-appointments endpoint")
        print("4. NO APPOINTMENT SLOTS: Database has no appointment slots for booking")
        print("5. MISSING ADMIN ENDPOINTS: No admin endpoint to create appointment slots for testing")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = AppointmentSystemTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 ALL APPOINTMENT SYSTEM TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n⚠️  SOME TESTS FAILED - CHECK DETAILS ABOVE")
        sys.exit(1)

if __name__ == "__main__":
    main()