import requests

auth_res = requests.post("http://localhost:8000/api/v1/auth/login", json={
    "email": "testuser_ocr@example.com",
    "password": "Password123!"
})
token = auth_res.json()["data"]["tokens"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Search medicines to get IDs for Paracetamol and Aspirin
para_res = requests.get("http://localhost:8000/api/v1/medicines/search?q=paracetamol", headers=headers).json()
asp_res = requests.get("http://localhost:8000/api/v1/medicines/search?q=aspirin", headers=headers).json()

para_id = para_res["data"][0]["id"]
asp_id = asp_res["data"][0]["id"]

print("PARACETAMOL ID:", para_id)
print("ASPIRIN ID:", asp_id)

print("\nSending POST /api/v1/interactions/check...")
check_res = requests.post(
    "http://localhost:8000/api/v1/interactions/check",
    headers=headers,
    json={"medicine_ids": [para_id, asp_id]}
)
print("INTERACTION CHECK STATUS:", check_res.status_code)
print("INTERACTION CHECK RESPONSE TEXT:", check_res.text)
