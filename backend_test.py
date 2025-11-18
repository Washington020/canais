#!/usr/bin/env python3
"""
🎯 TESTE COMPLETO DO SISTEMA LUXEPASS - TODAS AS FUNCIONALIDADES
Comprehensive testing of all LuxePass system functionalities as requested in review.
"""

import requests
import json
import time
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://pagsys.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test credentials from test_result.md
TEST_CREDENTIALS = {
    "cliente": {"email": "cliente@luxepass.com", "password": "cliente123"},
    "admin": {"email": "admin@luxepass.com", "password": "admin123"},
    "nutri": {"email": "nutri@luxepass.com", "password": "nutri123"},
    "personal": {"email": "personal@luxepass.com", "password": "personal123"},
    "vip": {"email": "vip@luxepass.com", "password": "vip123"},
    "intermediario": {"email": "intermediario@luxepass.com", "password": "inter123"},
    "gym": {"username": "academia_teste", "password": "teste123"}
}

class TestResults:
    def __init__(self):
        self.tests = []
        self.passed = 0
        self.failed = 0
    
    def add_test(self, name, passed, details=""):
        self.tests.append({
            "name": name,
            "passed": passed,
            "details": details
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print(f"\n{'='*80}")
        print(f"🎯 TESTE DO FLUXO MANUAL DE AGENDAMENTO - RESULTADOS FINAIS")
        print(f"{'='*80}")
        print(f"✅ TESTES APROVADOS: {self.passed}")
        print(f"❌ TESTES FALHARAM: {self.failed}")
        print(f"📊 TAXA DE SUCESSO: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        print(f"{'='*80}")
        
        for test in self.tests:
            status = "✅" if test["passed"] else "❌"
            print(f"{status} {test['name']}")
            if test["details"]:
                print(f"   {test['details']}")
        
        return self.passed, self.failed

def authenticate_user(user_type):
    """Authenticate user and return token"""
    try:
        if user_type in ["nutritionist", "personal"]:
            # Professional login
            response = requests.post(
                f"{API_BASE}/professionals/login",
                json=CREDENTIALS[user_type],
                timeout=10
            )
        else:
            # Client login
            response = requests.post(
                f"{API_BASE}/auth/login",
                json=CREDENTIALS[user_type],
                timeout=10
            )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"❌ Falha na autenticação {user_type}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erro na autenticação {user_type}: {e}")
        return None

def make_authenticated_request(method, endpoint, token, data=None):
    """Make authenticated request"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        if method.upper() == "GET":
            response = requests.get(f"{API_BASE}{endpoint}", headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(f"{API_BASE}{endpoint}", headers=headers, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(f"{API_BASE}{endpoint}", headers=headers, json=data, timeout=10)
        
        return response
    except Exception as e:
        print(f"❌ Erro na requisição {method} {endpoint}: {e}")
        return None

def test_manual_appointment_flow():
    """Test complete manual appointment flow"""
    results = TestResults()
    
    print(f"🎯 INICIANDO TESTE DO FLUXO MANUAL DE AGENDAMENTO")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{'='*80}")
    
    # Authenticate all users
    print("🔐 AUTENTICANDO USUÁRIOS...")
    client_token = authenticate_user("client")
    nutritionist_token = authenticate_user("nutritionist")
    personal_token = authenticate_user("personal")
    
    if not all([client_token, nutritionist_token, personal_token]):
        print("❌ FALHA CRÍTICA: Não foi possível autenticar todos os usuários")
        return results
    
    print("✅ Todos os usuários autenticados com sucesso")
    
    # TESTE 1: Cliente Cria Agendamento PENDING para Nutricionista
    print(f"\n{'='*60}")
    print("🧪 TESTE 1: Cliente Cria Agendamento PENDING (Nutricionista)")
    print(f"{'='*60}")
    
    appointment_data = {
        "professional_id": None,
        "professional_type": "nutritionist",
        "appointment_date": "2025-11-28",
        "appointment_time": "10:00",
        "notes": "Teste fluxo manual - Nutricionista"
    }
    
    response = make_authenticated_request("POST", "/appointments/book", client_token, appointment_data)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("status") == "pending":
            nutritionist_appointment_id = data.get("appointment_id")
            results.add_test(
                "TESTE 1: Cliente cria agendamento PENDING (Nutricionista)",
                True,
                f"Status: {data.get('status')}, ID: {nutritionist_appointment_id}, Mensagem: {data.get('message')}"
            )
            print(f"✅ Agendamento PENDING criado: {nutritionist_appointment_id}")
            print(f"📝 Mensagem: {data.get('message')}")
        else:
            results.add_test(
                "TESTE 1: Cliente cria agendamento PENDING (Nutricionista)",
                False,
                f"Status incorreto: {data.get('status')} (esperado: pending)"
            )
            nutritionist_appointment_id = None
    else:
        results.add_test(
            "TESTE 1: Cliente cria agendamento PENDING (Nutricionista)",
            False,
            f"Falha na requisição: {response.status_code if response else 'Timeout'}"
        )
        nutritionist_appointment_id = None
    
    # TESTE 2: Agendamento Aparece em "Novos Clientes" do Nutricionista
    print(f"\n{'='*60}")
    print("🧪 TESTE 2: Agendamento em 'Novos Clientes' (Nutricionista)")
    print(f"{'='*60}")
    
    response = make_authenticated_request("GET", "/professionals/pending-appointments", nutritionist_token)
    
    if response and response.status_code == 200:
        data = response.json()
        pending_appointments = data.get("pending_appointments", [])
        
        # Find our appointment
        found_appointment = None
        for apt in pending_appointments:
            if apt.get("professional_type") == "nutritionist" and apt.get("status") == "pending":
                found_appointment = apt
                break
        
        if found_appointment:
            results.add_test(
                "TESTE 2: Agendamento em 'Novos Clientes' (Nutricionista)",
                True,
                f"Encontrado agendamento ID: {found_appointment.get('id')}, Tipo: {found_appointment.get('professional_type')}"
            )
            print(f"✅ Agendamento encontrado na lista de novos clientes")
            print(f"📋 ID: {found_appointment.get('id')}")
            print(f"👤 Cliente: {found_appointment.get('client_name')}")
            print(f"📅 Data/Hora: {found_appointment.get('appointment_date')} às {found_appointment.get('appointment_time')}")
            
            # Use this ID for acceptance test
            if not nutritionist_appointment_id:
                nutritionist_appointment_id = found_appointment.get('id')
        else:
            results.add_test(
                "TESTE 2: Agendamento em 'Novos Clientes' (Nutricionista)",
                False,
                f"Agendamento não encontrado. Total pendentes: {len(pending_appointments)}"
            )
    else:
        results.add_test(
            "TESTE 2: Agendamento em 'Novos Clientes' (Nutricionista)",
            False,
            f"Falha na requisição: {response.status_code if response else 'Timeout'}"
        )
    
    # TESTE 3: Nutricionista ACEITA o Cliente
    print(f"\n{'='*60}")
    print("🧪 TESTE 3: Nutricionista ACEITA Cliente")
    print(f"{'='*60}")
    
    if nutritionist_appointment_id:
        response = make_authenticated_request("POST", f"/professionals/accept-client/{nutritionist_appointment_id}", nutritionist_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("appointment", {}).get("status") == "scheduled":
                results.add_test(
                    "TESTE 3: Nutricionista aceita cliente",
                    True,
                    f"Sucesso: {data.get('success')}, Status: {data.get('appointment', {}).get('status')}, Mensagem: {data.get('message')}"
                )
                print(f"✅ Cliente aceito com sucesso!")
                print(f"📝 Mensagem: {data.get('message')}")
                print(f"📊 Status do agendamento: {data.get('appointment', {}).get('status')}")
            else:
                results.add_test(
                    "TESTE 3: Nutricionista aceita cliente",
                    False,
                    f"Resposta inesperada: {data}"
                )
        else:
            results.add_test(
                "TESTE 3: Nutricionista aceita cliente",
                False,
                f"Falha na requisição: {response.status_code if response else 'Timeout'} - {response.text if response else 'N/A'}"
            )
    else:
        results.add_test(
            "TESTE 3: Nutricionista aceita cliente",
            False,
            "ID do agendamento não disponível dos testes anteriores"
        )
    
    # TESTE 4: Agendamento APARECE na Agenda Principal do Nutricionista
    print(f"\n{'='*60}")
    print("🧪 TESTE 4: Agendamento na Agenda Principal (Nutricionista)")
    print(f"{'='*60}")
    
    response = make_authenticated_request("GET", "/professionals/appointments", nutritionist_token)
    
    if response and response.status_code == 200:
        data = response.json()
        appointments = data.get("appointments", [])
        
        # Find our scheduled appointment
        found_scheduled = None
        for apt in appointments:
            if apt.get("id") == nutritionist_appointment_id or (
                apt.get("professional_type") == "nutritionist" and 
                apt.get("status") in ["scheduled", "confirmed"] and
                apt.get("professional_id") is not None
            ):
                found_scheduled = apt
                break
        
        if found_scheduled:
            results.add_test(
                "TESTE 4: Agendamento na Agenda Principal (Nutricionista)",
                True,
                f"Agendamento encontrado - ID: {found_scheduled.get('id')}, Status: {found_scheduled.get('status')}, Professional ID: {found_scheduled.get('professional_id')}"
            )
            print(f"✅ Agendamento encontrado na agenda principal")
            print(f"📋 ID: {found_scheduled.get('id')}")
            print(f"📊 Status: {found_scheduled.get('status')}")
            print(f"👨‍⚕️ Professional ID: {found_scheduled.get('professional_id')}")
        else:
            results.add_test(
                "TESTE 4: Agendamento na Agenda Principal (Nutricionista)",
                False,
                f"Agendamento não encontrado na agenda. Total agendamentos: {len(appointments)}"
            )
    else:
        results.add_test(
            "TESTE 4: Agendamento na Agenda Principal (Nutricionista)",
            False,
            f"Falha na requisição: {response.status_code if response else 'Timeout'}"
        )
    
    # TESTE 5: Agendamento NÃO Aparece Mais em "Novos Clientes"
    print(f"\n{'='*60}")
    print("🧪 TESTE 5: Agendamento NÃO está mais em 'Novos Clientes'")
    print(f"{'='*60}")
    
    response = make_authenticated_request("GET", "/professionals/pending-appointments", nutritionist_token)
    
    if response and response.status_code == 200:
        data = response.json()
        pending_appointments = data.get("pending_appointments", [])
        
        # Check if our appointment is still in pending list
        still_pending = False
        for apt in pending_appointments:
            if apt.get("id") == nutritionist_appointment_id:
                still_pending = True
                break
        
        if not still_pending:
            results.add_test(
                "TESTE 5: Agendamento NÃO está mais em 'Novos Clientes'",
                True,
                f"Agendamento removido da lista de pendentes. Total pendentes: {len(pending_appointments)}"
            )
            print(f"✅ Agendamento não está mais na lista de novos clientes")
            print(f"📊 Total agendamentos pendentes: {len(pending_appointments)}")
        else:
            results.add_test(
                "TESTE 5: Agendamento NÃO está mais em 'Novos Clientes'",
                False,
                "Agendamento ainda aparece na lista de pendentes"
            )
    else:
        results.add_test(
            "TESTE 5: Agendamento NÃO está mais em 'Novos Clientes'",
            False,
            f"Falha na requisição: {response.status_code if response else 'Timeout'}"
        )
    
    # TESTE 6: Mesmo Fluxo para Personal Trainer
    print(f"\n{'='*60}")
    print("🧪 TESTE 6: Fluxo Completo para Personal Trainer")
    print(f"{'='*60}")
    
    # 6A: Cliente cria agendamento para Personal
    appointment_data_personal = {
        "professional_id": None,
        "professional_type": "personal",
        "appointment_date": "2025-11-29",
        "appointment_time": "15:00",
        "notes": "Teste fluxo manual - Personal"
    }
    
    response = make_authenticated_request("POST", "/appointments/book", client_token, appointment_data_personal)
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get("status") == "pending":
            personal_appointment_id = data.get("appointment_id")
            print(f"✅ 6A: Agendamento PENDING criado para Personal: {personal_appointment_id}")
        else:
            personal_appointment_id = None
            print(f"❌ 6A: Status incorreto: {data.get('status')}")
    else:
        personal_appointment_id = None
        print(f"❌ 6A: Falha na criação do agendamento para Personal")
    
    # 6B: Personal vê o agendamento em pending
    response = make_authenticated_request("GET", "/professionals/pending-appointments", personal_token)
    
    personal_found = False
    if response and response.status_code == 200:
        data = response.json()
        pending_appointments = data.get("pending_appointments", [])
        
        for apt in pending_appointments:
            if apt.get("professional_type") == "personal" and apt.get("status") == "pending":
                personal_found = True
                if not personal_appointment_id:
                    personal_appointment_id = apt.get('id')
                print(f"✅ 6B: Personal encontrou agendamento pendente: {apt.get('id')}")
                break
    
    if not personal_found:
        print(f"❌ 6B: Personal não encontrou agendamento pendente")
    
    # 6C: Personal aceita o cliente
    if personal_appointment_id:
        response = make_authenticated_request("POST", f"/professionals/accept-client/{personal_appointment_id}", personal_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"✅ 6C: Personal aceitou cliente com sucesso")
            else:
                print(f"❌ 6C: Falha na aceitação do cliente pelo Personal")
        else:
            print(f"❌ 6C: Erro na requisição de aceitação do Personal")
    
    # 6D: Agendamento aparece na agenda do Personal
    response = make_authenticated_request("GET", "/professionals/appointments", personal_token)
    
    personal_scheduled_found = False
    if response and response.status_code == 200:
        data = response.json()
        appointments = data.get("appointments", [])
        
        for apt in appointments:
            if apt.get("professional_type") == "personal" and apt.get("status") in ["scheduled", "confirmed"]:
                personal_scheduled_found = True
                print(f"✅ 6D: Agendamento encontrado na agenda do Personal: {apt.get('id')}")
                break
    
    if not personal_scheduled_found:
        print(f"❌ 6D: Agendamento não encontrado na agenda do Personal")
    
    # Consolidate Personal Trainer test result
    personal_success = personal_appointment_id and personal_found and personal_scheduled_found
    results.add_test(
        "TESTE 6: Fluxo completo Personal Trainer",
        personal_success,
        f"Criação: {'✅' if personal_appointment_id else '❌'}, Pending: {'✅' if personal_found else '❌'}, Agenda: {'✅' if personal_scheduled_found else '❌'}"
    )
    
    # TESTE 7: Isolamento Entre Profissionais
    print(f"\n{'='*60}")
    print("🧪 TESTE 7: Isolamento Entre Profissionais")
    print(f"{'='*60}")
    
    # Nutritionist should not see Personal appointments
    response = make_authenticated_request("GET", "/professionals/pending-appointments", nutritionist_token)
    nutritionist_isolation = True
    
    if response and response.status_code == 200:
        data = response.json()
        pending_appointments = data.get("pending_appointments", [])
        
        for apt in pending_appointments:
            if apt.get("professional_type") == "personal":
                nutritionist_isolation = False
                break
    
    # Personal should not see Nutritionist appointments
    response = make_authenticated_request("GET", "/professionals/pending-appointments", personal_token)
    personal_isolation = True
    
    if response and response.status_code == 200:
        data = response.json()
        pending_appointments = data.get("pending_appointments", [])
        
        for apt in pending_appointments:
            if apt.get("professional_type") == "nutritionist":
                personal_isolation = False
                break
    
    isolation_success = nutritionist_isolation and personal_isolation
    results.add_test(
        "TESTE 7: Isolamento entre profissionais",
        isolation_success,
        f"Nutricionista não vê Personal: {'✅' if nutritionist_isolation else '❌'}, Personal não vê Nutricionista: {'✅' if personal_isolation else '❌'}"
    )
    
    if isolation_success:
        print(f"✅ Isolamento perfeito entre tipos de profissionais")
    else:
        print(f"❌ Falha no isolamento entre profissionais")
    
    return results

if __name__ == "__main__":
    print("🎯 TESTE DO FLUXO MANUAL DE AGENDAMENTO (PENDING → ACEITAR → SCHEDULED)")
    print("Sistema REVERTIDO para fluxo manual conforme solicitado pelo usuário")
    print(f"Testando contra: {BACKEND_URL}")
    
    results = test_manual_appointment_flow()
    passed, failed = results.print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)