"""
LatentLab Runner & Verification Suite (Python 3.12)
Team: Analytical Eye · Lead: Pankhuri Govila

Usage:
    py -3.12 run_app.py         # Launch server, health check & open browser
    py -3.12 run_app.py --test  # Run automated API & health verification
"""

import sys
import os
import subprocess
import time
import webbrowser
import urllib.request
import json

REQUIRED_PY_MAJOR = 3
REQUIRED_PY_MINOR = 12

def check_python_version():
    major = sys.version_info.major
    minor = sys.version_info.minor
    print(f"[Python Check] Detected Python {major}.{minor}.{sys.version_info.micro}")

    if major != REQUIRED_PY_MAJOR or minor != REQUIRED_PY_MINOR:
        print(f"\n[WARNING] This script is optimized for Python {REQUIRED_PY_MAJOR}.{REQUIRED_PY_MINOR}.")
        print(f"You are currently running Python {major}.{minor}.")
        print(f"To ensure stability, execute via the Python 3.12 launcher:")
        print(f"    py -3.12 run_app.py\n")
    else:
        print(f"[OK] Python {REQUIRED_PY_MAJOR}.{REQUIRED_PY_MINOR} verified.\n")

def is_server_alive(url="http://localhost:3000"):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'LatentLab-HealthChecker/1.0'})
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False

def test_ai_api():
    print("[Testing] Validating AI API route (/api/ai)...")
    url = "http://localhost:3000/api/ai"
    
    # 1. Test Conflict AI payload
    payload_conflict = {
        "action": "analyze_conflict",
        "payload": {
            "resourceId": "res-lasercutter-02",
            "startTime": "2026-10-30T10:00:00Z",
            "endTime": "2026-10-30T12:00:00Z",
            "existingBookings": []
        }
    }
    
    try:
        data = json.dumps(payload_conflict).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            res_data = json.loads(res.read().decode())
            assert res_data.get("success") is True
            print("  [PASS] Conflict Resolution AI endpoint responded successfully.")
    except Exception as e:
        print(f"  [FAIL] Conflict Resolution AI test failed: {e}")

    # 2. Test Incident Summarizer AI payload
    payload_incident = {
        "action": "summarize_incident",
        "payload": {
            "description": "High smoke detected near laser gantry. Cracked lens suspected."
        }
    }
    try:
        data = json.dumps(payload_incident).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            res_data = json.loads(res.read().decode())
            assert res_data.get("success") is True
            severity = res_data["data"]["severity"]
            print(f"  [PASS] Incident Summarizer AI responded with severity: [{severity.upper()}].")
    except Exception as e:
        print(f"  [FAIL] Incident Summarizer AI test failed: {e}")

    # 3. Test Federated RAG Pipeline
    payload_rag = {
        "action": "query_federated_rag",
        "payload": {
            "query": "cryo electron microscope vitrification",
            "userBadges": ["BSL-2 Biosafety"],
            "selectedCampus": "All"
        }
    }
    try:
        data = json.dumps(payload_rag).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            res_data = json.loads(res.read().decode())
            assert res_data.get("success") is True
            matches = len(res_data["data"]["matches"])
            passport = res_data["data"]["institutional_passport_status"]
            print(f"  [PASS] Federated RAG Pipeline retrieved {matches} campus apparatus ({passport}).")
    except Exception as e:
        print(f"  [FAIL] Federated RAG Pipeline test failed: {e}")

def main():
    check_python_version()

    if "--test" in sys.argv:
        if is_server_alive():
            test_ai_api()
        else:
            print("[Error] Next.js server is not running on http://localhost:3000. Start it first.")
        return

    # Check if server is already running
    if is_server_alive():
        print("[Status] LatentLab is ALREADY running at http://localhost:3000")
        print("[Browser] Opening http://localhost:3000 in your default browser...")
        webbrowser.open("http://localhost:3000")
        return

    # Start dev server from analytical-eye-lab
    app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analytical-eye-lab")
    if not os.path.exists(app_dir):
        print(f"[Error] Directory not found: {app_dir}")
        return

    print(f"[Starting] Launching Next.js dev server in {app_dir}...")
    proc = subprocess.Popen(["npm", "run", "dev"], cwd=app_dir, shell=True)

    print("[Waiting] Awaiting server readiness on http://localhost:3000...")
    for _ in range(30):
        time.sleep(1)
        if is_server_alive():
            print("\n" + "="*60)
            print("  * LatentLab is LIVE at http://localhost:3000")
            print("  * Press Ctrl+C in this terminal anytime to stop the server.")
            print("="*60 + "\n")
            webbrowser.open("http://localhost:3000")
            break
    else:
        print("[Warning] Server took longer than expected to report healthy. Check terminal output.")

    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\n[Stopping] Shutting down server...")
        proc.terminate()

if __name__ == "__main__":
    main()
