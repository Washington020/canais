#!/usr/bin/env python3
"""
Fix gym password for testing
"""

import requests
import json

# Configuration
BACKEND_URL = "https://gymaccess-1.preview.emergentagent.com/api"

def fix_gym_password():
    """Fix gym password using admin endpoint"""
    
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
    
    # Get list of gyms to find our test gym
    gyms_response = requests.get(f"{BACKEND_URL}/admin/gyms", headers=headers)
    
    if gyms_response.status_code != 200:
        print("❌ Failed to get gyms list")
        return False
    
    gyms = gyms_response.json()
    test_gym_id = None
    
    # Find the test gym
    for gym in gyms:
        if gym.get("name") == "Academia Teste LuxePass":
            test_gym_id = gym.get("id")
            break
    
    if not test_gym_id:
        print("❌ Test gym not found")
        return False
    
    print(f"✅ Found test gym with ID: {test_gym_id}")
    
    # Set password using admin endpoint
    password_response = requests.put(f"{BACKEND_URL}/admin/gyms/{test_gym_id}/set-password",
                                   json={
                                       "password": "teste123",
                                       "login": "academia_teste"
                                   }, headers=headers)
    
    if password_response.status_code == 200:
        print("✅ Password set successfully")
        
        # Test authentication
        auth_response = requests.post(f"{BACKEND_URL}/gym/auth", json={
            "login": "academia_teste",
            "password": "teste123"
        })
        
        if auth_response.status_code == 200:
            print("✅ Gym authentication working!")
            auth_data = auth_response.json()
            print(f"Gym ID: {auth_data.get('gym_info', {}).get('id')}")
            print(f"Gym Name: {auth_data.get('gym_info', {}).get('name')}")
            return True
        else:
            print(f"❌ Gym authentication still failed: {auth_response.status_code}")
            print(f"Response: {auth_response.text}")
            return False
    else:
        print(f"❌ Password setting failed: {password_response.status_code}")
        print(f"Response: {password_response.text}")
        return False

if __name__ == "__main__":
    fix_gym_password()