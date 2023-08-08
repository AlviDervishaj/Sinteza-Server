import { ChildProcessWithoutNullStreams } from "node:child_process";
import { Socket } from "socket.io";
import { EmitTypes } from "./Types";
import { Process } from "./classes/Process";

export const checkOutputSleeping = (output: string, proc: Process) => {
  if (output.includes("INFO | Next session will start at:")) {
    proc.result += output
    proc.status = "WAITING";
    return;
  }
};

export const checkOutputLogs = (output: string, proc: Process) => {
  if (output.includes(`INFO | Hello, @${proc.username}`)) {
    proc.result += output;
    const c = output.split(" ").filter((el) => el);
    const followers = parseInt(c[8]);
    const following = parseInt(c[11]);
    proc.followers = followers;
    proc.following = following;
    return;
  }
  else if (output.includes("INFO | Profile was not fully loaded")) return proc.result += output;
  else if (output.includes("IndexError: list index out of range")) return proc.result += output;
  else if (output.includes("INFO | SESSION")) return proc.result += output;
  else if (output.includes("INFO | Start time:")) return proc.result += output;
  else if (output.includes("INFO | Finish time:")) return proc.result += output;
  else if (output.includes("INFO | Duration")) return proc.result += output;
  else if (output.includes("INFO | You have logged out from")) return proc.result += output;
  else if (output.includes("INFO | -------- START:")) {
    proc.status = "RUNNING";
    proc.scheduled = false;
    return proc.result += output;
  }
  else if (output.includes("scheduled for this session")) return proc.result += output;
  else if (output.includes("INFO | Current active-job: ")) return proc.result += output;
  else if (output.includes("INFO | Completed sessions:")) return proc.result += output;
  else if (output.includes("INFO | TOTAL")) return proc.result += output;
  else if (output.includes("INFO | Total duration:")) return proc.result += output;
  else if (output.includes("INFO | Total interactions:")) return proc.result += output;
  else if (output.includes("INFO | Total followed:")) return proc.result += output;
  else if (output.includes("INFO | Total likes:")) return proc.result += output;
  else if (output.includes("INFO | Total comments:")) return proc.result += output;
  else if (output.includes("INFO | Total PM sent:")) return proc.result += output;
  else if (output.includes("INFO | Total watched:")) return proc.result += output;
  else if (output.includes("INFO | Total unfollowed:")) return proc.result += output;
  else return;
};

export const checkOutputErrors = (output: string, proc: Process) => {
  if (output.includes("ERROR | Probably block dialog is shown")) return proc.result += output;
  else if (output.includes("ERROR | Can't unlock your screen.")) return proc.result += output;
  else if (output.includes("ERROR | Something is keeping closing IG APP. Please check your logcat to understand the reason! `adb logcat`")) return proc.result += output;
  else if (output.includes("ERROR | Cannot get followers count text")) return proc.result += output;
  else if (output.includes("ERROR | Cannot get following count text")) return proc.result += output;
  else if (output.includes("ERROR | Reached crashes limit.")) {
    proc.status = "STOPPED";
    return proc.result += output;
  }
  else return;
};

export const checkOutputWarnings = (output: string, proc: Process) => {
  if (output.includes("WARNING | ")) return proc.result += output;
  else return;
};

export const checkBotFinished = (output: string, proc: Process) => {
  if (output.includes("INFO | -------- FINISH:")) {
    proc.status = "FINISHED";
    proc.result += output;
    return;
  }
  else if (output.includes("INFO | This bot is backed with love by me for free.")) {
    proc.status = "FINISHED";
    proc.result += output;
    return;
  }
  else return false;
}
export const checkOutputCritical = (output: string, proc: Process) => {
  if (output.includes("CRITICAL | ")) return proc.result += output;
  else return;
};

export const checkOutputCrashes = (output: string, proc: Process) => {
  if (output.includes(" INFO | - Total Crashes:				OK (1/5)")) {
    return proc.total_crashes = 1;
  } else if (output.includes(" INFO | - Total Crashes:				OK (2/5)")) {
    return proc.total_crashes = 2;
  } else if (output.includes(" INFO | - Total Crashes:				OK (3/5)")) {
    return proc.total_crashes = 3;
  } else if (output.includes(" INFO | - Total Crashes:				OK (4/5)")) {
    return proc.total_crashes = 4;
  } else if (output.includes(" INFO | - Total Crashes:				OK (5/5)")) {
    return proc.total_crashes = 5;
  } else if (
    output.includes("This kind of exception will stop the bot (no restart).")
  ) {
    return proc.total_crashes = 5;
  } else if (output.includes("RuntimeError: USB device")) {
    return proc.total_crashes = 5;
  } else if (output.includes("adbutils.errors.AdbError: device")) {
    return proc.total_crashes = 5;
  }
  else return;
};

export const checkSessionLimits = (output: string) => {
  if (output.includes("INFO | Checking session limits:")) return true;
  else if (output.includes("INFO | - Total Likes:")) return true;
  else if (output.includes("INFO | - Total Comments: ")) return true;
  else if (output.includes("INFO | - Total PM:")) return true;
  else if (output.includes("INFO | - Total Followed:")) return true;
  else if (output.includes("INFO | - Total Unfollowed:")) return true;
  else if (output.includes("INFO | - Total Watched:")) return true;
  else if (output.includes("INFO | - Total Successful Interactions:")) return true;
  else if (output.includes("INFO | - Total Interactions:")) return true;
  else if (output.includes("INFO | - Total Crashes:")) return true;
  else if (output.includes("INFO | - Total Successful Scraped Users:")) return true;
  else if (output.includes("INFO | At last one of these limits has been reached:")) return true;
  else return false;
}

export function transferChildProcessOutput(
  cmd: ChildProcessWithoutNullStreams,
  connection: Socket,
  emitType: EmitTypes,
) {
  cmd.stderr.on("data", (chunk: string | Buffer) => {
    console.log(`Stderr data : ${chunk.toString('utf-8')}`);
  })
  cmd.stdout.on("data", (chunk: string | Buffer) => {
    const chunkString = chunk.toString("utf-8");
    const fData: string = chunkString
      .split("\n")
      .map((line: string) => line)
      .join("\n");

    console.log(`${emitType} -> ${fData}`);
    connection.emit<EmitTypes>(emitType, fData)
  });
  cmd.on("close", (code: number | null) => {
    console.log("[INFO] FINISHED.\nCODE : ", code);
  });
}
