import os
import subprocess
import platform
import sys
import json
from dotenv import dotenv_values

env = dotenv_values(os.path.join(os.path.dirname(
    os.path.dirname(__file__)), '.env.development'))
data = json.loads(sys.stdin.read())

if not data["username"]:
    print("Please enter a valid instagram username")
    exit()
if not data["config_name"]:
    print("Please enter a valid config name")
    exit()

run_path = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'Bot', 'run.py')
config_path = os.path.join(os.path.dirname(os.path.dirname(
    __file__)), 'accounts', data["username"], data["config_name"])

print(f"[INFO] Starting Bot for {data['username']}")
command = "python" if platform.system() == "Windows" else "python3"
output = subprocess.Popen(
    [command, run_path, '--config',  config_path])
print(f"[INFO] Bot for {data['username']} started.")
print(f"{output.stdout.read() if output.stdout else ''}")
