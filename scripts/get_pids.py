import wmi

# Initializing the wmi constructor
f = wmi.WMI()

# Iterating through all the running processes
for process in f.Win32_Process():
    # get python processes
    if(process.Name == "python.exe" and "get_pids.py" not in process.CommandLine and "sessions.py" not in process.CommandLine):
        # spawned args
        spawned_args = process.CommandLine
        pid = process.ProcessId
        print(f"{spawned_args} {pid}\n")
