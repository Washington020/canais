#!/usr/bin/env python3
"""
Comprehensive test of gym authentication flow after fixes
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fit-scheduler-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def comprehensive_gym_test():
    print("🎯 COMPREHENSIVE GYM AUTHENTICATION TEST AFTER FIXES")
    print("="*60)
    print("Testing all gym authentication scenarios after data structure fixes:")
    print("1. Auto-generated credentials")
    print("2. Manual password setting")
    print("3. Password reset functionality")
    
    results = []
    
    # Test 1: Auto-generated credentials
    print("\n1️⃣ Testing Auto-Generated Credentials...")
    gym_data = {
        "name": "Test Gym Auto Final",
        "cnpj": "11.111.111/0001-11",
        "endereco": "Rua Auto, 111",
        "numero": "111",
        "bairro": "Vila Auto",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01111-111",
        "email": "auto@finaltest.com",
        "telefone_principal": "(11) 11111-1111",
        "tipo_academia": "Auto",
        "responsavel_nome": "Auto User",
        "responsavel_email": "auto@finaltest.com",
        "responsavel_telefone": "(11) 11111-1111"
    }
    
    response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data, timeout=30)
    if response.status_code == 200:
        data = response.json()
        gym_id = data["gym_id"]
        auto_login = data["login"]
        auto_password = data["password"]
        print(f"   Created gym: {gym_id}")
        print(f"   Auto Login: {auto_login}")
        print(f"   Auto Password: {auto_password}")
        
        # Approve gym
        approve_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id}/status", json={"status": "approved"}, timeout=30)
        print(f"   Approval status: {approve_response.status_code}")
        
        # Test authentication
        auth_response = requests.post(f"{API_BASE}/gym/auth", 
                                    json={"login": auto_login, "password": auto_password}, timeout=30)
        
        print(f"   Auth status: {auth_response.status_code}")
        if auth_response.status_code == 200:
            auth_data = auth_response.json()
            results.append("✅ Auto-generated credentials: WORKING")
            print("   ✅ Auto-generated credentials authentication successful")
            print(f"   Access Token: {auth_data.get('access_token', '')[:20]}...")
            print(f"   Gym Name: {auth_data.get('gym_info', {}).get('name', 'N/A')}")
        else:
            results.append("❌ Auto-generated credentials: FAILED")
            print(f"   ❌ Auto-generated credentials failed: {auth_response.text}")
    else:
        results.append("❌ Auto-generated credentials: FAILED (gym creation)")
        print(f"   ❌ Failed to create gym: {response.text}")
    
    # Test 2: Manual password setting
    print("\n2️⃣ Testing Manual Password Setting...")
    gym_data2 = {
        "name": "Test Gym Manual Final",
        "cnpj": "22.222.222/0001-22",
        "endereco": "Rua Manual, 222",
        "numero": "222",
        "bairro": "Vila Manual",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "02222-222",
        "email": "manual@finaltest.com",
        "telefone_principal": "(11) 22222-2222",
        "tipo_academia": "Manual",
        "responsavel_nome": "Manual User",
        "responsavel_email": "manual@finaltest.com",
        "responsavel_telefone": "(11) 22222-2222"
    }
    
    response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data2, timeout=30)
    if response.status_code == 200:
        data = response.json()
        gym_id2 = data["gym_id"]
        print(f"   Created gym: {gym_id2}")
        
        # Set manual password
        manual_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id2}/set-password", 
                                     json={"password": "manual123", "login": "gym_manual_final"}, timeout=30)
        
        print(f"   Manual password set status: {manual_response.status_code}")
        if manual_response.status_code == 200:
            # Approve gym
            approve_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id2}/status", json={"status": "approved"}, timeout=30)
            print(f"   Approval status: {approve_response.status_code}")
            
            # Test authentication with manual credentials
            auth_response = requests.post(f"{API_BASE}/gym/auth", 
                                        json={"login": "gym_manual_final", "password": "manual123"}, timeout=30)
            
            print(f"   Auth status: {auth_response.status_code}")
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                results.append("✅ Manual password setting: WORKING")
                print("   ✅ Manual password authentication successful")
                print(f"   Access Token: {auth_data.get('access_token', '')[:20]}...")
                print(f"   Gym Name: {auth_data.get('gym_info', {}).get('name', 'N/A')}")
            else:
                results.append("❌ Manual password setting: FAILED")
                print(f"   ❌ Manual password authentication failed: {auth_response.text}")
        else:
            results.append("❌ Manual password setting: FAILED (password setting)")
            print(f"   ❌ Failed to set manual password: {manual_response.text}")
    else:
        results.append("❌ Manual password setting: FAILED (gym creation)")
        print(f"   ❌ Failed to create gym: {response.text}")
    
    # Test 3: Password reset functionality
    print("\n3️⃣ Testing Password Reset Functionality...")
    gym_data3 = {
        "name": "Test Gym Reset Final",
        "cnpj": "33.333.333/0001-33",
        "endereco": "Rua Reset, 333",
        "numero": "333",
        "bairro": "Vila Reset",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "03333-333",
        "email": "reset@finaltest.com",
        "telefone_principal": "(11) 33333-3333",
        "tipo_academia": "Reset",
        "responsavel_nome": "Reset User",
        "responsavel_email": "reset@finaltest.com",
        "responsavel_telefone": "(11) 33333-3333"
    }
    
    response = requests.post(f"{API_BASE}/admin/gyms/register", json=gym_data3, timeout=30)
    if response.status_code == 200:
        data = response.json()
        gym_id3 = data["gym_id"]
        print(f"   Created gym: {gym_id3}")
        
        # Reset password
        reset_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id3}/reset-password", timeout=30)
        
        print(f"   Password reset status: {reset_response.status_code}")
        if reset_response.status_code == 200:
            reset_data = reset_response.json()
            reset_login = reset_data["login"]
            reset_password = reset_data["new_password"]
            print(f"   Reset Login: {reset_login}")
            print(f"   Reset Password: {reset_password}")
            
            # Approve gym
            approve_response = requests.put(f"{API_BASE}/admin/gyms/{gym_id3}/status", json={"status": "approved"}, timeout=30)
            print(f"   Approval status: {approve_response.status_code}")
            
            # Test authentication with reset credentials
            auth_response = requests.post(f"{API_BASE}/gym/auth", 
                                        json={"login": reset_login, "password": reset_password}, timeout=30)
            
            print(f"   Auth status: {auth_response.status_code}")
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                results.append("✅ Password reset functionality: WORKING")
                print("   ✅ Password reset authentication successful")
                print(f"   Access Token: {auth_data.get('access_token', '')[:20]}...")
                print(f"   Gym Name: {auth_data.get('gym_info', {}).get('name', 'N/A')}")
            else:
                results.append("❌ Password reset functionality: FAILED")
                print(f"   ❌ Password reset authentication failed: {auth_response.text}")
        else:
            results.append("❌ Password reset functionality: FAILED (password reset)")
            print(f"   ❌ Failed to reset password: {reset_response.text}")
    else:
        results.append("❌ Password reset functionality: FAILED (gym creation)")
        print(f"   ❌ Failed to create gym: {response.text}")
    
    # Summary
    print("\n" + "="*60)
    print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
    print("="*60)
    
    for result in results:
        print(f"  {result}")
    
    working_count = sum(1 for r in results if "✅" in r)
    total_count = len(results)
    
    print(f"\nOverall Success Rate: {working_count}/{total_count} ({(working_count/total_count)*100:.1f}%)")
    
    if working_count == total_count:
        print("\n🎉 ALL GYM AUTHENTICATION SCENARIOS WORKING!")
        print("✅ The reported issues have been successfully resolved:")
        print("   ✓ Manual passwords generated in Admin app now work for Gym app login")
        print("   ✓ New generated passwords are being saved properly")
        print("   ✓ Auto-generated credentials work correctly")
        print("   ✓ Password reset functionality is operational")
        print("\n💡 ROOT CAUSE WAS: Data structure mismatch between save and retrieve operations")
        print("🔧 SOLUTION: Fixed gym registration to use consistent login_credentials structure")
        return True
    else:
        print(f"\n⚠️  {total_count - working_count} test(s) still failing")
        print("Further investigation needed for remaining issues")
        return False

if __name__ == "__main__":
    comprehensive_gym_test()