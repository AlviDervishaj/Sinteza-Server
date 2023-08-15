from datetime import datetime


def write(text: str) -> None:
    # write to log file
    with open(f"accounts/{USERNAME}/{USERNAME}.log", "a") as f:
        hours = datetime.now().strftime("%H:%M")
        f.write(f"[{hours}] | {text}\n")
        f.close()


def override() -> None:
    # clean the log file each time bot is started
    with open(f"accounts/{USERNAME}/{USERNAME}.log", "w+") as f:
        f.write("")
        f.close()


def init(username: str) -> None:
    global USERNAME
    USERNAME = username
