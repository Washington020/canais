#!/usr/bin/env python3
"""
Create test gym for LuxePass testing
"""

import requests
import json
from datetime import datetime, timezone

# Configuration
BACKEND_URL = "https://trainer-portal-11.preview.emergentagent.com/api"

def create_test_gym():
    """Create test gym with academia_teste/teste123 credentials"""
    
    # First, login as admin
    admin_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@luxepass.com",
        "password": "admin123"
    })
    
    if admin_response.status_code != 200:
        print("❌ Admin login failed")
        return False
    
    admin_token = admin_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create gym with specific credentials
    gym_data = {
        "name": "Academia Teste LuxePass",
        "cnpj": "12.345.678/0001-90",
        "razao_social": "Academia Teste LTDA",
        "endereco": "Rua das Academias",
        "numero": "123",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01234-567",
        "email": "contato@academiateste.com",
        "telefone_principal": "(11) 3333-4444",
        "tipo_academia": "Completa",
        "responsavel_nome": "João Silva",
        "responsavel_email": "joao@academiateste.com",
        "responsavel_telefone": "(11) 99999-3333",
        "custom_login": "academia_teste",
        "custom_password": "teste123"
    }
    
    # Register gym
    register_response = requests.post(f"{BACKEND_URL}/admin/gyms/register", 
                                    json=gym_data, headers=headers)
    
    if register_response.status_code == 200:
        gym_result = register_response.json()
        gym_id = gym_result.get("gym_id")
        print(f"✅ Gym created with ID: {gym_id}")
        
        # Approve the gym
        approve_response = requests.put(f"{BACKEND_URL}/admin/gyms/{gym_id}/status",
                                      json={"status": "approved"}, headers=headers)
        
        if approve_response.status_code == 200:
            print("✅ Gym approved")
            
            # Test authentication
            auth_response = requests.post(f"{BACKEND_URL}/gym/auth", json={
                "login": "academia_teste",
                "password": "teste123"
            })
            
            if auth_response.status_code == 200:
                print("✅ Gym authentication working")
                return True
            else:
                print(f"❌ Gym authentication failed: {auth_response.status_code}")
                print(f"Response: {auth_response.text}")
                return False
        else:
            print(f"❌ Gym approval failed: {approve_response.status_code}")
            return False
    else:
        print(f"❌ Gym creation failed: {register_response.status_code}")
        print(f"Response: {register_response.text}")
        return False

if __name__ == "__main__":
    create_test_gym()