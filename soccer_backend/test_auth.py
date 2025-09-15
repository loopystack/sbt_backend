import requests
import json

# Test the authentication endpoints
BASE_URL = "http://localhost:5001/api/auth"

def test_signup():
    """Test user registration"""
    print("🧪 Testing user registration...")
    
    signup_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=signup_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Signup successful!")
            return True
        else:
            print("❌ Signup failed!")
            return False
            
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return False

def test_login():
    """Test user login"""
    print("\n🧪 Testing user login...")
    
    login_data = {
        "username": "test@example.com",  # Can use email or username
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", data=login_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return True
        else:
            print("❌ Login failed!")
            return False
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False

def test_server_health():
    """Test if server is running"""
    print("🧪 Testing server health...")
    
    try:
        response = requests.get("http://localhost:5001/api/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Server is running!")
            return True
        else:
            print("❌ Server health check failed!")
            return False
            
    except Exception as e:
        print(f"❌ Server not running: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Authentication System")
    print("=" * 50)
    
    # Test server health first
    if not test_server_health():
        print("\n❌ Server is not running. Please start the backend server first.")
        exit(1)
    
    # Test signup
    signup_success = test_signup()
    
    # Test login
    login_success = test_login()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Signup: {'✅ PASS' if signup_success else '❌ FAIL'}")
    print(f"Login: {'✅ PASS' if login_success else '❌ FAIL'}")
    
    if signup_success and login_success:
        print("\n🎉 All tests passed! Authentication is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the error messages above.")
