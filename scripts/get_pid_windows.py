import psutil
import sys
# linux -> python3
# windows -> python.exe

_path = sys.stdin.read()

file_path = _path.split('**')[0]
spawned_args = _path.split('**')[1]

print(file_path, spawned_args)


def find_python_pid(target_file, target_args):
    for process in psutil.process_iter(['pid', 'name', 'cmdline']):
        if process.info['name'] == 'python.exe' and \
                target_args in process.info['cmdline']:
            print(process)
            return process.info['pid']
    return None


pid = find_python_pid(file_path, spawned_args)
if pid:
    print(pid, flush=True)
else:
    print("Process not found.")
