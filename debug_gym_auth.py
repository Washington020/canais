#!/usr/bin/env python3
"""
Debug script to test gym authentication directly
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://trainer-portal-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def test_gym_auth_debug():
    print("🔍 DEBUGGING GYM AUTHENTICATION")
    print("="*50)
    
    # Step 1: Create a test gym
    print("\n1️⃣ Creating test gym...")
    gym_data = {
        "name": "Debug Test Gym",
        "cnpj": "99.999.999/0001-99",
        "endereco": "Rua Debug, 999",
        "numero": "999",
        "bairro": "Vila Debug",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01999-999",
        "email": "debug@test.com",
        "telefone_principal": "(11) 99999-9999",
        "tipo_academia": "Debug",
        "responsavel_nome": "Debug User",
        "responsavel_email": "debug@test.com",
        "responsavel_telefone": "(11) 99999-9999"
    }
    
    response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, timeout=30)
    print(f"Registration Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        gym_id = data["gym_id"]
        auto_login = data["login"]
        auto_password = data["password"]
        print(f"✅ Gym created: {gym_id}")
        print(f"   Auto Login: {auto_login}")
        print(f"   Auto Password: {auto_password}")
        
        # Step 2: Approve the gym
        print("\n2️⃣ Approving gym...")
        approve_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id}/status", 
                                      json={"status": "approved"}, timeout=30)
        print(f"Approval Status: {approve_response.status_code}")
        
        if approve_response.status_code == 200:
            print("✅ Gym approved")
            
            # Step 3: Test authentication with auto-generated credentials
            print("\n3️⃣ Testing authentication with auto-generated credentials...")
            auth_data = {
                "login": auto_login,
                "password": auto_password
            }
            
            auth_response = requests.post(f"{API_BASE}/gym/auth", json=auth_data, timeout=30)
            print(f"Auth Status: {auth_response.status_code}")
            print(f"Auth Response: {auth_response.text}")
            
            if auth_response.status_code == 200:
                print("✅ Authentication successful!")
                auth_result = auth_response.json()
                print(f"   Access Token: {auth_result.get('access_token', 'N/A')[:20]}...")
                print(f"   Gym Info: {auth_result.get('gym_info', {})}")
            else:
                print("❌ Authentication failed!")
                try:
                    error_detail = auth_response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Raw Error: {auth_response.text}")
                    
            # Step 4: Check what's actually in the database
            print("\n4️⃣ Checking gym data in database...")
            gyms_response = requests.get(f"{API_BASE}/admin/gyms", timeout=30)
            if gyms_response.status_code == 200:
                gyms_data = gyms_response.json()
                gyms_list = gyms_data if isinstance(gyms_data, list) else gyms_data.get("gyms", [])
                
                # Find our test gym
                test_gym = None
                for gym in gyms_list:
                    if gym.get("id") == gym_id:
                        test_gym = gym
                        break
                
                if test_gym:
                    print("✅ Found test gym in database:")
                    print(f"   ID: {test_gym.get('id')}")
                    print(f"   Name: {test_gym.get('name')}")
                    print(f"   Status: {test_gym.get('status')}")
                    print(f"   Login (old field): {test_gym.get('login', 'NOT FOUND')}")
                    print(f"   Hashed Password (old field): {test_gym.get('hashed_password', 'NOT FOUND')}")
                    print(f"   Login Credentials: {test_gym.get('login_credentials', 'NOT FOUND')}")
                    
                    # Check if login_credentials structure exists
                    login_creds = test_gym.get('login_credentials', {})
                    if login_creds:
                        print(f"   ✅ login_credentials found:")
                        print(f"      username: {login_creds.get('username', 'NOT FOUND')}")
                        print(f"      password_hash: {'EXISTS' if login_creds.get('password_hash') else 'NOT FOUND'}")
                    else:
                        print(f"   ❌ login_credentials NOT FOUND")
                else:
                    print("❌ Test gym not found in database!")
            else:
                print("❌ Failed to retrieve gyms from database")
                
        else:
            print("❌ Failed to approve gym")
    else:
        print("❌ Failed to create gym")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_gym_auth_debug()