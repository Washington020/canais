#!/usr/bin/env python3
"""
Focused Gym Authentication Test
Tests the POST /api/gym/auth endpoint as specifically requested
"""

import requests
import json
import os

# Backend URL
BACKEND_URL = "https://luxecoach.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_gym_auth():
    """Test gym authentication endpoint"""
    print("🏋️ TESTING GYM AUTHENTICATION ENDPOINT")
    print("="*60)
    
    # Test 1: Try with provided credentials
    print("\n1️⃣ Testing with provided credentials...")
    credentials = {
        "login": "gym_academia_teste_2039",
        "password": "sm7zK4QN"
    }
    
    try:
        response = requests.post(f"{API_BASE}/gym/auth", json=credentials, timeout=30)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS: Gym authentication working!")
            print(f"Access Token: {data.get('access_token', 'N/A')[:20]}...")
            print(f"Token Type: {data.get('token_type', 'N/A')}")
            print(f"Gym Info: {data.get('gym_info', 'N/A')}")
            return True
        elif response.status_code == 401:
            error_data = response.json()
            print(f"❌ INVALID CREDENTIALS: {error_data.get('detail', 'Unknown error')}")
            print("The provided credentials are not valid. Let's create a test gym...")
        else:
            print(f"❌ UNEXPECTED ERROR: Status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ REQUEST FAILED: {e}")
        return False
    
    # Test 2: Create a test gym and try authentication
    print("\n2️⃣ Creating test gym for authentication...")
    gym_data = {
        "name": "Academia Teste Autenticação FitPass",
        "cnpj": "12.345.678/0001-90",
        "endereco": "Rua da Autenticação, 456",
        "numero": "456",
        "bairro": "Vila Auth",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01456-789",
        "email": "auth.test@academiafit.com",
        "telefone_principal": "(11) 99999-1234",
        "tipo_academia": "Funcional",
        "responsavel_nome": "João Autenticação",
        "responsavel_email": "joao.auth@academiafit.com",
        "responsavel_telefone": "(11) 88888-1234"
    }
    
    try:
        # Create gym
        create_response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, timeout=30)
        print(f"Gym Creation Status: {create_response.status_code}")
        
        if create_response.status_code == 200:
            create_data = create_response.json()
            gym_id = create_data["gym_id"]
            test_login = create_data["login"]
            test_password = create_data["password"]
            
            print(f"✅ Test gym created successfully!")
            print(f"Gym ID: {gym_id}")
            print(f"Login: {test_login}")
            print(f"Password: {test_password}")
            
            # Approve the gym
            print("\n3️⃣ Approving test gym...")
            approve_response = requests.put(
                f"{API_BASE}/admin/gyms/{gym_id}/status", 
                json={"status": "approved"}, 
                timeout=30
            )
            
            if approve_response.status_code == 200:
                print("✅ Gym approved successfully!")
                
                # Test authentication with new gym
                print("\n4️⃣ Testing authentication with new gym...")
                test_credentials = {
                    "login": test_login,
                    "password": test_password
                }
                
                auth_response = requests.post(f"{API_BASE}/gym/auth", json=test_credentials, timeout=30)
                print(f"Authentication Status: {auth_response.status_code}")
                
                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    print("✅ SUCCESS: Gym authentication working!")
                    print(f"Access Token: {auth_data.get('access_token', 'N/A')[:20]}...")
                    print(f"Token Type: {auth_data.get('token_type', 'N/A')}")
                    
                    gym_info = auth_data.get('gym_info', {})
                    print(f"Gym Info:")
                    print(f"  - ID: {gym_info.get('id', 'N/A')}")
                    print(f"  - Name: {gym_info.get('name', 'N/A')}")
                    print(f"  - Type: {gym_info.get('type', 'N/A')}")
                    print(f"  - Status: {gym_info.get('status', 'N/A')}")
                    
                    # Verify required fields
                    required_fields = ["access_token", "token_type", "gym_info"]
                    gym_info_fields = ["id", "name", "type", "status"]
                    
                    if all(field in auth_data for field in required_fields):
                        if all(field in gym_info for field in gym_info_fields):
                            print("\n🎉 ALL TESTS PASSED!")
                            print("✅ POST /api/gym/auth endpoint working correctly")
                            print("✅ Returns access_token (JWT for academia)")
                            print("✅ Returns gym_info (dados da academia logada)")
                            print("✅ All required fields present in response")
                            return True
                        else:
                            missing = [f for f in gym_info_fields if f not in gym_info]
                            print(f"❌ gym_info missing fields: {missing}")
                    else:
                        missing = [f for f in required_fields if f not in auth_data]
                        print(f"❌ Response missing fields: {missing}")
                else:
                    error_data = auth_response.json() if auth_response.status_code != 500 else {"detail": auth_response.text}
                    print(f"❌ Authentication failed: {error_data.get('detail', 'Unknown error')}")
            else:
                print(f"❌ Failed to approve gym: {approve_response.status_code}")
                print(f"Response: {approve_response.text}")
        else:
            print(f"❌ Failed to create gym: {create_response.status_code}")
            print(f"Response: {create_response.text}")
            
    except Exception as e:
        print(f"❌ REQUEST FAILED: {e}")
        
    return False

if __name__ == "__main__":
    print("🎯 Testing Gym Authentication System as requested...")
    print(f"Backend URL: {BACKEND_URL}")
    
    success = test_gym_auth()
    
    if success:
        print("\n✅ GYM AUTHENTICATION TEST COMPLETED SUCCESSFULLY!")
        print("The gym authentication system is fully operational.")
    else:
        print("\n❌ GYM AUTHENTICATION TEST FAILED!")
        print("Issues found that need to be addressed.")