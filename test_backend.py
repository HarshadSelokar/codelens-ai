import requests

try:
    # Test health endpoint
    response = requests.get("http://localhost:8000/health")
    print(f"✅ Backend is running!")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Backend is not responding: {e}")
