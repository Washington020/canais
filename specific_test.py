#!/usr/bin/env python3
"""
Specific test for the exact scenarios described in the review request
"""

import requests
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "https://fit-scheduler-11.preview.emergentagent.com/api"

def test_exact_scenarios():
    """Test the exact scenarios from the review request"""
    
    print("🎯 TESTE DO NOVO FLUXO DE AGENDAMENTO AUTOMÁTICO")
    print("="*60)
    
    # Test 1: Login Cliente
    print("\n1. Login Cliente: cliente@luxepass.com/cliente123")
    client_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "cliente@luxepass.com",
        "password": "cliente123"
    })
    
    if client_response.status_code != 200:
        print(f"❌ Client login failed: {client_response.status_code}")
        return False
    
    client_token = client_response.json()["access_token"]
    print(f"✅ Client login successful")
    
    # Test 2: Book appointment for nutritionist with exact payload
    print("\n2. Teste de Agendamento com Atribuição Automática (Nutritionist)")
    booking_payload = {
        "professional_id": None,
        "professional_type": "nutritionist",
        "appointment_date": "2025-11-25",
        "appointment_time": "14:00",
        "notes": "Teste de agendamento automático"
    }
    
    headers = {"Authorization": f"Bearer {client_token}"}
    booking_response = requests.post(f"{BACKEND_URL}/appointments/book", 
                                   json=booking_payload, headers=headers)
    
    if booking_response.status_code != 200:
        print(f"❌ Nutritionist booking failed: {booking_response.status_code}")
        print(f"Response: {booking_response.text}")
        return False
    
    booking_data = booking_response.json()
    print(f"✅ Nutritionist booking successful")
    print(f"   Status: {booking_data.get('status')}")
    print(f"   Professional: {booking_data.get('professional_name')}")
    print(f"   Message: {booking_data.get('message')}")
    
    # Verify expected results
    if booking_data.get("status") != "confirmed":
        print(f"❌ Expected status 'confirmed', got '{booking_data.get('status')}'")
        return False
    
    if not booking_data.get("professional_name"):
        print(f"❌ Expected professional_name, got None")
        return False
    
    nutritionist_appointment_id = booking_data.get("appointment_id")
    
    # Test 3: Login Nutritionist
    print("\n3. Login Nutricionista: nutri@luxepass.com/nutri123")
    nutri_response = requests.post(f"{BACKEND_URL}/professionals/login", json={
        "email": "nutri@luxepass.com",
        "password": "nutri123"
    })
    
    if nutri_response.status_code != 200:
        print(f"❌ Nutritionist login failed: {nutri_response.status_code}")
        return False
    
    nutri_token = nutri_response.json()["access_token"]
    print(f"✅ Nutritionist login successful")
    
    # Test 4: Verify appointment in nutritionist's schedule
    print("\n4. Verificar Agendamento na Agenda do Nutricionista")
    nutri_headers = {"Authorization": f"Bearer {nutri_token}"}
    appointments_response = requests.get(f"{BACKEND_URL}/professionals/appointments", 
                                       headers=nutri_headers)
    
    if appointments_response.status_code != 200:
        print(f"❌ Failed to get nutritionist appointments: {appointments_response.status_code}")
        return False
    
    appointments_data = appointments_response.json()
    appointments = appointments_data.get("appointments", [])
    print(f"✅ Retrieved {len(appointments)} appointments")
    
    # Find the created appointment
    found_appointment = None
    for apt in appointments:
        if apt.get("id") == nutritionist_appointment_id:
            found_appointment = apt
            break
    
    if not found_appointment:
        print(f"❌ Appointment {nutritionist_appointment_id} not found in nutritionist's schedule")
        return False
    
    print(f"✅ Appointment found in nutritionist's schedule")
    print(f"   Professional ID: {found_appointment.get('professional_id')}")
    print(f"   Status: {found_appointment.get('status')}")
    print(f"   Professional Name: {found_appointment.get('professional_name')}")
    
    # Verify appointment details
    if found_appointment.get("professional_id") is None:
        print(f"❌ Expected professional_id to be filled, got None")
        return False
    
    if found_appointment.get("status") != "confirmed":
        print(f"❌ Expected status 'confirmed', got '{found_appointment.get('status')}'")
        return False
    
    if not found_appointment.get("professional_name"):
        print(f"❌ Expected professional_name to be filled, got None")
        return False
    
    # Test 5: Book appointment for personal trainer
    print("\n5. Teste de Agendamento para Personal Trainer")
    personal_booking_payload = {
        "professional_id": None,
        "professional_type": "personal",
        "appointment_date": "2025-11-26",
        "appointment_time": "15:00",
        "notes": "Teste personal trainer automático"
    }
    
    personal_booking_response = requests.post(f"{BACKEND_URL}/appointments/book", 
                                            json=personal_booking_payload, headers=headers)
    
    if personal_booking_response.status_code != 200:
        print(f"❌ Personal trainer booking failed: {personal_booking_response.status_code}")
        print(f"Response: {personal_booking_response.text}")
        return False
    
    personal_booking_data = personal_booking_response.json()
    print(f"✅ Personal trainer booking successful")
    print(f"   Status: {personal_booking_data.get('status')}")
    print(f"   Professional: {personal_booking_data.get('professional_name')}")
    print(f"   Message: {personal_booking_data.get('message')}")
    
    personal_appointment_id = personal_booking_data.get("appointment_id")
    
    # Test 6: Login Personal Trainer
    print("\n6. Login Personal: personal@luxepass.com/personal123")
    personal_response = requests.post(f"{BACKEND_URL}/professionals/login", json={
        "email": "personal@luxepass.com",
        "password": "personal123"
    })
    
    if personal_response.status_code != 200:
        print(f"❌ Personal trainer login failed: {personal_response.status_code}")
        return False
    
    personal_token = personal_response.json()["access_token"]
    print(f"✅ Personal trainer login successful")
    
    # Test 7: Verify appointment in personal trainer's schedule
    print("\n7. Verificar Agendamento na Agenda do Personal Trainer")
    personal_headers = {"Authorization": f"Bearer {personal_token}"}
    personal_appointments_response = requests.get(f"{BACKEND_URL}/professionals/appointments", 
                                                headers=personal_headers)
    
    if personal_appointments_response.status_code != 200:
        print(f"❌ Failed to get personal trainer appointments: {personal_appointments_response.status_code}")
        return False
    
    personal_appointments_data = personal_appointments_response.json()
    personal_appointments = personal_appointments_data.get("appointments", [])
    print(f"✅ Retrieved {len(personal_appointments)} appointments")
    
    # Find the created appointment
    found_personal_appointment = None
    for apt in personal_appointments:
        if apt.get("id") == personal_appointment_id:
            found_personal_appointment = apt
            break
    
    if not found_personal_appointment:
        print(f"❌ Appointment {personal_appointment_id} not found in personal trainer's schedule")
        return False
    
    print(f"✅ Appointment found in personal trainer's schedule")
    
    # Test 8: Verify isolation between professionals
    print("\n8. Verificar Isolamento entre Profissionais")
    
    # Check nutritionist only sees nutritionist appointments
    nutritionist_types = [apt.get("professional_type") for apt in appointments]
    nutritionist_isolation = all(ptype == "nutritionist" for ptype in nutritionist_types)
    
    # Check personal trainer only sees personal appointments
    personal_types = [apt.get("professional_type") for apt in personal_appointments]
    personal_isolation = all(ptype == "personal" for ptype in personal_types)
    
    # Check no ID overlap
    nutritionist_ids = {apt.get("id") for apt in appointments}
    personal_ids = {apt.get("id") for apt in personal_appointments}
    id_overlap = nutritionist_ids.intersection(personal_ids)
    
    print(f"   Nutritionist isolation: {nutritionist_isolation}")
    print(f"   Personal trainer isolation: {personal_isolation}")
    print(f"   ID overlap: {len(id_overlap)} appointments")
    
    if not nutritionist_isolation or not personal_isolation or len(id_overlap) > 0:
        print(f"❌ Professional isolation failed")
        return False
    
    print(f"✅ Professional isolation verified")
    
    print(f"\n{'='*60}")
    print(f"🎯 RESULTADO ESPERADO - TODOS OS TESTES APROVADOS!")
    print(f"✅ Cliente consegue agendar e recebe confirmação imediata com nome do profissional")
    print(f"✅ Agendamento aparece AUTOMATICAMENTE na agenda do profissional correto")
    print(f"✅ Status é 'confirmed' (não 'pending')")
    print(f"✅ Profissionais veem apenas seus próprios agendamentos do seu tipo")
    
    return True

if __name__ == "__main__":
    success = test_exact_scenarios()
    exit(0 if success else 1)