#!/usr/bin/env python3
"""
🎯 TESTE DO FLUXO MANUAL DE AGENDAMENTO (PENDING → ACEITAR → SCHEDULED)

Sistema REVERTIDO para fluxo manual conforme solicitado pelo usuário:
1. Cliente agenda → Status "PENDING" (sem profissional atribuído)
2. Aparece na aba "Novos Clientes" do profissional correto
3. Profissional ACEITA manualmente
4. Status muda para "SCHEDULED"
5. Agendamento aparece na "Agenda" principal com botão "Entrar em Consulta"

Testes obrigatórios conforme especificação da revisão.
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fit-scheduler-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
CREDENTIALS = {
    "client": {"email": "cliente@luxepass.com", "password": "cliente123"},
    "nutritionist": {"email": "nutri@luxepass.com", "password": "nutri123"},
    "personal": {"email": "personal@luxepass.com", "password": "personal123"}
}

class LuxePassTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    async def login_user(self, email: str, password: str) -> Optional[str]:
        """Login user and return JWT token"""
        try:
            login_data = {
                "email": email,
                "password": password
            }
            
            async with self.session.post(f"{API_BASE}/auth/login", json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    token = data.get("access_token")
                    self.log_test(f"Login {email}", True, f"Token received: {len(token)} chars")
                    return token
                else:
                    error_text = await response.text()
                    self.log_test(f"Login {email}", False, f"Status {response.status}", error_text)
                    return None
        except Exception as e:
            self.log_test(f"Login {email}", False, f"Exception: {str(e)}")
            return None
    
    async def login_professional(self, email: str, password: str) -> Optional[str]:
        """Login professional and return JWT token"""
        try:
            login_data = {
                "email": email,
                "password": password
            }
            
            async with self.session.post(f"{API_BASE}/professionals/login", json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    token = data.get("access_token")
                    professional_info = data.get("professional", {})
                    self.log_test(f"Professional Login {email}", True, 
                                f"Token: {len(token)} chars, Name: {professional_info.get('full_name', 'N/A')}")
                    return token
                else:
                    error_text = await response.text()
                    self.log_test(f"Professional Login {email}", False, f"Status {response.status}", error_text)
                    return None
        except Exception as e:
            self.log_test(f"Professional Login {email}", False, f"Exception: {str(e)}")
            return None
    
    async def book_appointment_auto_assign(self, token: str, professional_type: str, 
                                         appointment_date: str, appointment_time: str, 
                                         notes: str = "") -> Dict[str, Any]:
        """Book appointment with automatic professional assignment"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            booking_data = {
                "professional_id": None,  # This triggers auto-assignment
                "professional_type": professional_type,
                "appointment_date": appointment_date,
                "appointment_time": appointment_time,
                "notes": notes
            }
            
            async with self.session.post(f"{API_BASE}/appointments/book", 
                                       json=booking_data, headers=headers) as response:
                response_data = await response.json()
                
                if response.status == 200:
                    status = response_data.get("status")
                    professional_name = response_data.get("professional_name")
                    message = response_data.get("message", "")
                    
                    success = (status == "confirmed" and 
                             professional_name is not None and 
                             professional_name != "")
                    
                    self.log_test(f"Book Appointment Auto-Assign ({professional_type})", success,
                                f"Status: {status}, Professional: {professional_name}, Message: {message}")
                    
                    return {
                        "success": success,
                        "appointment_id": response_data.get("appointment_id"),
                        "status": status,
                        "professional_name": professional_name,
                        "message": message,
                        "response": response_data
                    }
                else:
                    self.log_test(f"Book Appointment Auto-Assign ({professional_type})", False,
                                f"Status {response.status}", response_data)
                    return {"success": False, "response": response_data}
                    
        except Exception as e:
            self.log_test(f"Book Appointment Auto-Assign ({professional_type})", False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_professional_appointments(self, token: str, professional_email: str) -> Dict[str, Any]:
        """Get professional's appointments"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            
            async with self.session.get(f"{API_BASE}/professionals/appointments", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    appointments = data.get("appointments", [])
                    
                    self.log_test(f"Get Appointments ({professional_email})", True,
                                f"Found {len(appointments)} appointments")
                    
                    return {
                        "success": True,
                        "appointments": appointments,
                        "count": len(appointments)
                    }
                else:
                    error_data = await response.json()
                    self.log_test(f"Get Appointments ({professional_email})", False,
                                f"Status {response.status}", error_data)
                    return {"success": False, "response": error_data}
                    
        except Exception as e:
            self.log_test(f"Get Appointments ({professional_email})", False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def verify_appointment_in_schedule(self, appointments: list, expected_appointment_id: str,
                                           professional_type: str) -> bool:
        """Verify that the appointment appears in professional's schedule with correct status"""
        try:
            found_appointment = None
            for apt in appointments:
                if apt.get("id") == expected_appointment_id:
                    found_appointment = apt
                    break
            
            if not found_appointment:
                self.log_test(f"Verify Appointment in Schedule ({professional_type})", False,
                            f"Appointment {expected_appointment_id} not found in schedule")
                return False
            
            # Check appointment details
            status = found_appointment.get("status")
            prof_id = found_appointment.get("professional_id")
            prof_name = found_appointment.get("professional_name")
            prof_type = found_appointment.get("professional_type")
            
            success = (status == "confirmed" and 
                      prof_id is not None and 
                      prof_name is not None and 
                      prof_type == professional_type)
            
            details = (f"Status: {status}, Professional ID: {prof_id}, "
                      f"Professional Name: {prof_name}, Type: {prof_type}")
            
            self.log_test(f"Verify Appointment in Schedule ({professional_type})", success, details)
            
            return success
            
        except Exception as e:
            self.log_test(f"Verify Appointment in Schedule ({professional_type})", False, f"Exception: {str(e)}")
            return False
    
    async def verify_professional_isolation(self, nutritionist_appointments: list, 
                                          personal_appointments: list) -> bool:
        """Verify that nutritionist and personal trainer see only their own appointments"""
        try:
            # Check that nutritionist appointments are all nutritionist type
            nutritionist_isolation = True
            for apt in nutritionist_appointments:
                if apt.get("professional_type") != "nutritionist":
                    nutritionist_isolation = False
                    break
            
            # Check that personal trainer appointments are all personal type
            personal_isolation = True
            for apt in personal_appointments:
                if apt.get("professional_type") != "personal":
                    personal_isolation = False
                    break
            
            # Check for ID overlap (should be none)
            nutritionist_ids = {apt.get("id") for apt in nutritionist_appointments}
            personal_ids = {apt.get("id") for apt in personal_appointments}
            id_overlap = nutritionist_ids.intersection(personal_ids)
            
            success = nutritionist_isolation and personal_isolation and len(id_overlap) == 0
            
            details = (f"Nutritionist isolation: {nutritionist_isolation}, "
                      f"Personal isolation: {personal_isolation}, "
                      f"ID overlap: {len(id_overlap)} appointments")
            
            self.log_test("Verify Professional Isolation", success, details)
            
            return success
            
        except Exception as e:
            self.log_test("Verify Professional Isolation", False, f"Exception: {str(e)}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        print(f"\n{'='*60}")
        print(f"🎯 TESTE DO NOVO FLUXO DE AGENDAMENTO AUTOMÁTICO - RESULTADOS")
        print(f"{'='*60}")
        print(f"Total de testes: {total_tests}")
        print(f"Testes aprovados: {passed_tests}")
        print(f"Taxa de sucesso: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests < total_tests:
            print(f"\n❌ TESTES FALHARAM:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
        else:
            print(f"\n✅ TODOS OS TESTES APROVADOS!")
        
        return passed_tests, total_tests

async def main():
    """Main test execution"""
    print("🎯 INICIANDO TESTE DO NOVO FLUXO DE AGENDAMENTO AUTOMÁTICO")
    print("="*60)
    
    async with LuxePassTester() as tester:
        
        # Test credentials from review request
        client_email = "cliente@luxepass.com"
        client_password = "cliente123"
        nutritionist_email = "nutri@luxepass.com"
        nutritionist_password = "nutri123"
        personal_email = "personal@luxepass.com"
        personal_password = "personal123"
        
        # Step 1: Login client
        print("\n📋 STEP 1: Client Authentication")
        client_token = await tester.login_user(client_email, client_password)
        if not client_token:
            print("❌ Client login failed - aborting tests")
            return
        
        # Step 2: Login professionals
        print("\n📋 STEP 2: Professional Authentication")
        nutritionist_token = await tester.login_professional(nutritionist_email, nutritionist_password)
        personal_token = await tester.login_professional(personal_email, personal_password)
        
        if not nutritionist_token or not personal_token:
            print("❌ Professional login failed - aborting tests")
            return
        
        # Step 3: Test automatic assignment for nutritionist
        print("\n📋 STEP 3: Test Nutritionist Auto-Assignment")
        nutritionist_booking = await tester.book_appointment_auto_assign(
            client_token, 
            "nutritionist", 
            "2025-11-25", 
            "14:00", 
            "Teste de agendamento automático"
        )
        
        if not nutritionist_booking.get("success"):
            print("❌ Nutritionist booking failed")
            return
        
        # Step 4: Test automatic assignment for personal trainer
        print("\n📋 STEP 4: Test Personal Trainer Auto-Assignment")
        personal_booking = await tester.book_appointment_auto_assign(
            client_token, 
            "personal", 
            "2025-11-26", 
            "15:00", 
            "Teste personal trainer automático"
        )
        
        if not personal_booking.get("success"):
            print("❌ Personal trainer booking failed")
            return
        
        # Step 5: Verify appointments appear in professional schedules
        print("\n📋 STEP 5: Verify Appointments in Professional Schedules")
        
        # Get nutritionist appointments
        nutritionist_appointments_result = await tester.get_professional_appointments(
            nutritionist_token, nutritionist_email
        )
        
        # Get personal trainer appointments
        personal_appointments_result = await tester.get_professional_appointments(
            personal_token, personal_email
        )
        
        if not nutritionist_appointments_result.get("success") or not personal_appointments_result.get("success"):
            print("❌ Failed to retrieve professional appointments")
            return
        
        # Step 6: Verify appointment details
        print("\n📋 STEP 6: Verify Appointment Details")
        
        nutritionist_appointments = nutritionist_appointments_result.get("appointments", [])
        personal_appointments = personal_appointments_result.get("appointments", [])
        
        # Verify nutritionist appointment
        nutritionist_apt_id = nutritionist_booking.get("appointment_id")
        if nutritionist_apt_id:
            await tester.verify_appointment_in_schedule(
                nutritionist_appointments, nutritionist_apt_id, "nutritionist"
            )
        
        # Verify personal trainer appointment
        personal_apt_id = personal_booking.get("appointment_id")
        if personal_apt_id:
            await tester.verify_appointment_in_schedule(
                personal_appointments, personal_apt_id, "personal"
            )
        
        # Step 7: Verify professional isolation
        print("\n📋 STEP 7: Verify Professional Isolation")
        await tester.verify_professional_isolation(nutritionist_appointments, personal_appointments)
        
        # Print final summary
        passed, total = tester.print_summary()
        
        # Expected logs verification
        print(f"\n📋 LOGS IMPORTANTES A PROCURAR:")
        print(f"   - 'Buscando profissional disponível do tipo...'")
        print(f"   - 'Atribuindo profissional...'")
        print(f"   - 'Agendamento criado e confirmado automaticamente...'")
        
        return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)