#!/usr/bin/env python3
"""
Test Portuguese error messages in FitPass Brasil API
"""

import requests
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fitpass-ecosystem.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def test_portuguese_errors():
    """Test that error messages are in Portuguese"""
    print("🇧🇷 Testing Portuguese Error Messages")
    print("="*50)
    
    # Test 1: Invalid token validation
    print("\n1️⃣ Testing invalid token error...")
    response = requests.post(f"{API_BASE}/tokens/validate/invalid-token?gym_id=test-gym")
    if response.status_code == 404:
        error_msg = response.json().get("detail", "")
        if "não encontrado" in error_msg.lower():
            print(f"✅ Portuguese error: {error_msg}")
        else:
            print(f"❌ Error not in Portuguese: {error_msg}")
    
    # Test 2: Expired token (we'll use a fake expired token scenario)
    print("\n2️⃣ Testing token validation with used token...")
    # First login to get a token
    login_data = {"email": "cliente@fitpass.com", "password": "cliente123"}
    login_response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Generate a token
        gen_response = requests.post(f"{API_BASE}/tokens/generate?token_type=gym&validity_hours=1", 
                                   json={}, headers=headers)
        
        if gen_response.status_code == 200:
            token_code = gen_response.json()["token_code"]
            
            # Validate it once
            requests.post(f"{API_BASE}/tokens/validate/{token_code}?gym_id=test-gym")
            
            # Try to validate again (should be "já foi utilizado")
            response = requests.post(f"{API_BASE}/tokens/validate/{token_code}?gym_id=test-gym")
            if response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if "já foi utilizado" in error_msg.lower():
                    print(f"✅ Portuguese error: {error_msg}")
                else:
                    print(f"❌ Error not in Portuguese: {error_msg}")
    
    print("\n✅ Portuguese error messages test completed!")

if __name__ == "__main__":
    test_portuguese_errors()