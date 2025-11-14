#!/usr/bin/env python3
"""
Test successful gym registration with unique data
"""

import requests
import json
import random
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://gymvideos.preview.emergentagent.com/api"

def test_unique_gym_registration():
    """Test successful gym registration with unique CNPJ"""
    
    # Admin login
    response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@luxepass.com",
        "password": "admin123"
    })
    
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.status_code}")
        return
    
    admin_token = response.json().get("access_token")
    print("✅ Admin authentication successful")
    
    # Generate unique CNPJ
    unique_cnpj = f"12.345.678/{random.randint(1000, 9999)}-{random.randint(10, 99)}"
    unique_email = f"teste{random.randint(1000, 9999)}@academiateste.com"
    
    gym_data = {
        "name": f"Academia Teste Única {random.randint(1000, 9999)}",
        "cnpj": unique_cnpj,
        "email": unique_email,
        "endereco": "Rua das Academias Únicas",
        "numero": "123",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01234-567",
        "telefone_principal": "(11) 3333-4444",
        "responsavel_nome": "João Silva",
        "responsavel_email": unique_email,
        "responsavel_telefone": "(11) 99999-3333"
    }
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BACKEND_URL}/admin/gyms/register", json=gym_data, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ SUCCESSFUL GYM REGISTRATION TEST PASSED")
        print(f"   Gym ID: {data.get('gym_id')}")
        print(f"   Login: {data.get('login')}")
        print(f"   Password: {data.get('password')}")
        print(f"   Status: {data.get('status')}")
        print(f"   Message contains 'PARCEIRO CADASTRADO': {'PARCEIRO CADASTRADO' in data.get('message', '')}")
        
        # Test gym authentication
        auth_data = {
            "login": data.get("login"),
            "password": data.get("password")
        }
        
        auth_response = requests.post(f"{BACKEND_URL}/gym/auth", json=auth_data)
        
        if auth_response.status_code == 200:
            auth_data = auth_response.json()
            print("✅ GYM AUTHENTICATION TEST PASSED")
            print(f"   Access Token: {auth_data.get('access_token')[:20]}...")
            print(f"   Gym Name: {auth_data.get('gym_info', {}).get('name')}")
        else:
            print(f"❌ Gym authentication failed: {auth_response.status_code}")
            print(f"   Response: {auth_response.text}")
    else:
        print(f"❌ Gym registration failed: {response.status_code}")
        print(f"   Response: {response.text}")

if __name__ == "__main__":
    test_unique_gym_registration()