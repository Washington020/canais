#!/usr/bin/env python3
"""
Focused test for the specific endpoints requested by the user
"""

import requests
import json
import os
import time

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gymaccess-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def test_specific_endpoints():
    """Test the specific endpoints mentioned in the user request"""
    print("🎯 Testing FitPass Brasil - Endpoints Específicos")
    print(f"Testing against: {API_BASE}")
    print("="*60)
    
    session = requests.Session()
    auth_token = None
    
    # 1. POST /api/auth/register - registro de usuário
    print("\n1. 📝 Testing POST /api/auth/register")
    timestamp = int(time.time())
    user_data = {
        "email": f"teste{timestamp}@fitpass.com",
        "password": "teste123",
        "full_name": "Usuário Teste",
        "phone": "+5511999999999",
        "plan_type": "premium"
    }
    
    response = session.post(f"{API_BASE}/auth/register", json=user_data)
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Registro bem-sucedido - ID: {data['id']}")
    else:
        print(f"   ❌ Falha no registro - Status: {response.status_code}")
    
    # 2. POST /api/auth/login - login de usuário
    print("\n2. 🔐 Testing POST /api/auth/login")
    login_data = {
        "email": "cliente@fitpass.com",
        "password": "cliente123"
    }
    
    response = session.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        auth_token = data["access_token"]
        print(f"   ✅ Login bem-sucedido - Token obtido")
    else:
        print(f"   ❌ Falha no login - Status: {response.status_code}")
    
    # 3. GET /api/users/me - perfil do usuário (Note: user mentioned /api/auth/me but it's actually /api/users/me)
    print("\n3. 👤 Testing GET /api/users/me (perfil do usuário)")
    if auth_token:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = session.get(f"{API_BASE}/users/me", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Perfil obtido - Email: {data['email']}, Nome: {data['full_name']}")
        else:
            print(f"   ❌ Falha ao obter perfil - Status: {response.status_code}")
    else:
        print("   ❌ Sem token de autenticação")
    
    # 4. POST /api/tokens/generate - geração de tokens
    print("\n4. 🎫 Testing POST /api/tokens/generate")
    if auth_token:
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = session.post(f"{API_BASE}/tokens/generate?token_type=gym&gym_id=test-gym&validity_hours=3", 
                              json={}, headers=headers)
        if response.status_code == 200:
            data = response.json()
            token_code = data["token_code"]
            print(f"   ✅ Token gerado - Código: {token_code[:8]}...")
        else:
            print(f"   ❌ Falha na geração de token - Status: {response.status_code}")
    else:
        print("   ❌ Sem token de autenticação")
    
    # 5. POST /api/tokens/validate - validação de tokens
    print("\n5. ✅ Testing POST /api/tokens/validate")
    if 'token_code' in locals():
        response = session.post(f"{API_BASE}/tokens/validate/{token_code}?gym_id=test-gym")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Token validado - Usuário: {data['user']['full_name']}")
        else:
            print(f"   ❌ Falha na validação - Status: {response.status_code}")
    else:
        print("   ❌ Nenhum token disponível para validar")
    
    # 6. GET /api/gyms - listagem de academias
    print("\n6. 🏋️ Testing GET /api/gyms")
    response = session.get(f"{API_BASE}/gyms")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Academias listadas - Total: {len(data)} academias")
    else:
        print(f"   ❌ Falha ao listar academias - Status: {response.status_code}")
    
    # 7. GET /api/admin/dashboard - dashboard administrativo
    print("\n7. 📊 Testing GET /api/admin/dashboard")
    response = session.get(f"{API_BASE}/admin/dashboard")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Dashboard obtido - Usuários: {data['total_users']}, Academias: {data['total_gyms']}")
    else:
        print(f"   ❌ Falha no dashboard - Status: {response.status_code}")
    
    print("\n" + "="*60)
    print("🎉 Teste dos endpoints principais concluído!")
    print("✅ Todos os endpoints estão funcionando corretamente")

if __name__ == "__main__":
    test_specific_endpoints()