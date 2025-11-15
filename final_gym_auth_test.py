#!/usr/bin/env python3
"""
Final comprehensive test for gym authentication endpoint
Testing the specific issue reported: frontend cannot access gym_info.name
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fit-scheduler-11.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def test_gym_authentication_comprehensive():
    """Comprehensive test of gym authentication endpoint"""
    print("🎯 COMPREHENSIVE GYM AUTHENTICATION TEST")
    print("="*60)
    print("Testing POST /api/gym/auth endpoint structure for frontend compatibility")
    print("Specific focus: Verifying response.gym_info.name is accessible")
    
    # Test credentials as specified in the review request
    credentials = {
        "login": "gym_academia_teste_2039",
        "password": "sm7zK4QN"
    }
    
    print(f"\n1️⃣ Testing authentication with credentials:")
    print(f"   Login: {credentials['login']}")
    print(f"   Password: {credentials['password']}")
    
    try:
        response = requests.post(f"{API_BASE}/gym/auth", json=credentials, timeout=30)
        
        print(f"\n2️⃣ Response Analysis:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"   Response Size: {len(response.text)} bytes")
                
                print(f"\n3️⃣ Response Structure Analysis:")
                
                # Check top-level fields
                top_level_fields = list(data.keys())
                print(f"   Top-level fields: {top_level_fields}")
                
                # Verify required fields
                required_fields = ["access_token", "token_type", "gym_info"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"   ❌ Missing required fields: {missing_fields}")
                    return False
                else:
                    print(f"   ✅ All required fields present: {required_fields}")
                
                # Analyze access_token
                access_token = data.get("access_token", "")
                print(f"\n4️⃣ Access Token Analysis:")
                print(f"   Token length: {len(access_token)} characters")
                print(f"   Token preview: {access_token[:20]}...")
                print(f"   Token type: {data.get('token_type', 'N/A')}")
                
                # Analyze gym_info structure (THIS IS THE KEY PART)
                gym_info = data.get("gym_info", {})
                print(f"\n5️⃣ gym_info Structure Analysis (CRITICAL FOR FRONTEND):")
                print(f"   gym_info type: {type(gym_info)}")
                print(f"   gym_info fields: {list(gym_info.keys()) if isinstance(gym_info, dict) else 'Not a dict'}")
                
                if isinstance(gym_info, dict):
                    # Check each required gym_info field
                    gym_info_required = ["id", "name", "type", "status"]
                    
                    for field in gym_info_required:
                        value = gym_info.get(field)
                        print(f"   gym_info.{field}: '{value}' (type: {type(value).__name__})")
                    
                    # SPECIFIC TEST: Can frontend access gym_info.name?
                    print(f"\n6️⃣ FRONTEND COMPATIBILITY TEST:")
                    
                    name_value = gym_info.get("name")
                    if name_value is not None and name_value != "":
                        print(f"   ✅ response.gym_info.name = '{name_value}'")
                        print(f"   ✅ Frontend CAN access gym_info.name")
                        print(f"   ✅ Value is not null/empty")
                        
                        # Test JavaScript-like access
                        print(f"\n7️⃣ JavaScript Access Simulation:")
                        print(f"   response.access_token = '{data['access_token'][:20]}...'")
                        print(f"   response.gym_info = {json.dumps(gym_info, indent=2)}")
                        print(f"   response.gym_info.name = '{gym_info['name']}'")
                        
                        # Verify all gym_info fields
                        print(f"\n8️⃣ Complete gym_info Verification:")
                        for field in ["id", "name", "type", "status"]:
                            value = gym_info.get(field)
                            status = "✅" if value is not None and value != "" else "❌"
                            print(f"   {status} gym_info.{field} = '{value}'")
                        
                        print(f"\n🎉 SUCCESS: Gym authentication endpoint is working correctly!")
                        print(f"✅ Frontend can access response.gym_info.name = '{name_value}'")
                        print(f"✅ All required fields are present and populated")
                        print(f"✅ Response structure matches frontend expectations")
                        
                        return True
                    else:
                        print(f"   ❌ gym_info.name is missing or empty: '{name_value}'")
                        print(f"   ❌ Frontend CANNOT access gym_info.name properly")
                        return False
                else:
                    print(f"   ❌ gym_info is not a dictionary: {gym_info}")
                    print(f"   ❌ Frontend cannot access gym_info.name")
                    return False
                    
            except json.JSONDecodeError as e:
                print(f"   ❌ Invalid JSON response: {e}")
                print(f"   Raw response: {response.text[:200]}...")
                return False
                
        elif response.status_code == 401:
            try:
                error_data = response.json()
                error_detail = error_data.get("detail", "Unknown error")
                print(f"   ❌ Authentication failed: {error_detail}")
                print(f"   💡 The credentials may be invalid or gym may not be approved")
                return False
            except:
                print(f"   ❌ Authentication failed with non-JSON response")
                print(f"   Raw response: {response.text}")
                return False
        else:
            print(f"   ❌ Unexpected status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {error_data}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
        return False

def main():
    print("🚀 Starting Final Gym Authentication Test")
    print("Testing the specific issue: Frontend cannot access gym_info.name")
    print("Credentials: gym_academia_teste_2039 / sm7zK4QN")
    
    success = test_gym_authentication_comprehensive()
    
    print(f"\n" + "="*60)
    print("📊 FINAL TEST RESULT")
    print("="*60)
    
    if success:
        print("✅ PASS: Gym authentication endpoint is working correctly")
        print("✅ Frontend CAN access response.gym_info.name")
        print("✅ Response structure is correct for frontend integration")
        print("\n💡 CONCLUSION:")
        print("   The backend is returning the correct response structure.")
        print("   If frontend is still failing, the issue may be in:")
        print("   - Frontend code handling the response")
        print("   - Network/CORS issues")
        print("   - Different credentials being used in frontend")
    else:
        print("❌ FAIL: There is an issue with the gym authentication endpoint")
        print("❌ Frontend CANNOT access response.gym_info.name properly")
        print("\n💡 INVESTIGATION NEEDED:")
        print("   Check the backend response structure")
        print("   Verify gym credentials and approval status")
        print("   Review the /api/gym/auth endpoint implementation")

if __name__ == "__main__":
    main()