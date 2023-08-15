import { ChildProcessWithoutNullStreams } from "node:child_process";
import { Socket } from "socket.io";
import { EmitTypes } from "./Types";
import { Process } from "./classes/Process";

// DONE
export const checkOutputSleeping = (output: string, proc: Process): void => {
  if (output.startsWith("Next session will start at:")) {
    proc.status = "WAITING";
    return;
  }
};

export const checkOutputLogs = (output: string, proc: Process) => {
  // DONE
  if (output.startsWith(`Hello`)) {
    const c = output.split(" ").filter((el) => el);
    const followers = parseInt(c[8]);
    const following = parseInt(c[11]);
    proc.followers = followers;
    proc.following = following;
    return;
  }
};

export const checkOutputErrors = (output: string, proc: Process) => {
  if (output.includes("ERROR | Probably block dialog is shown"))
    return (proc.result += output);
  else if (output.includes("ERROR | Can't unlock your screen."))
    return (proc.result += output);
  else if (
    output.includes(
      "ERROR | Something is keeping closing IG APP. Please check your logcat to understand the reason! `adb logcat`"
    )
  )
    return (proc.result += output);
  else if (output.includes("ERROR | Cannot get followers count text"))
    return (proc.result += output);
  else if (output.includes("ERROR | Cannot get following count text"))
    return (proc.result += output);
  else if (output.includes("ERROR | Reached crashes limit.")) {
    proc.status = "STOPPED";
    return (proc.result += output);
  } else return;
};

export const checkOutputWarnings = (output: string, proc: Process): void => {
  if (output.startsWith("WARNING | ")) {
    proc.result += output;
    return;
  } else return;
};

// KEEP
export const checkBotFinished = (output: string, proc: Process): void => {
  if (output.startsWith("Finished.")) {
    proc.status = "FINISHED";
    proc.result += output;
    return;
  } else return;
};
export const checkOutputCritical = (output: string, proc: Process): void => {
  if (output.startsWith("CRITICAL | ")) {
    proc.result += output;
    return;
  } else return;
};

// KEEP
export const checkOutputCrashes = (output: string, proc: Process): void => {
  if (output.startsWith("Total Crashes: 1/5")) {
    proc.total_crashes = 1;
    return;
  } else if (output.startsWith("Total Crashes: 2/5")) {
    proc.total_crashes = 2;
    return;
  } else if (output.startsWith("Total Crashes: 3/5")) {
    proc.total_crashes = 3;
    return;
  } else if (output.startsWith("Total Crashes: 4/5")) {
    proc.total_crashes = 4;
    return;
  } else if (output.startsWith("Total Crashes: 5/5")) {
    proc.total_crashes = 5;
    return;
  } else if (
    output.includes("This kind of exception will stop the bot (no restart).")
  ) {
    proc.total_crashes = 5;
    return;
  } else if (output.includes("RuntimeError: USB device")) {
    proc.total_crashes = 5;
    return;
  } else if (output.includes("adbutils.errors.AdbError: device")) {
    proc.total_crashes = 5;
    return;
  } else return;
};

// export const checkSessionLimits = (output: string) => {
//   if (output.includes("INFO | Checking session limits:")) return true;
//   else if (output.includes("INFO | - Total Likes:")) return true;
//   else if (output.includes("INFO | - Total Comments: ")) return true;
//   else if (output.includes("INFO | - Total PM:")) return true;
//   else if (output.includes("INFO | - Total Followed:")) return true;
//   else if (output.includes("INFO | - Total Unfollowed:")) return true;
//   else if (output.includes("INFO | - Total Watched:")) return true;
//   else if (output.includes("INFO | - Total Successful Interactions:"))
//     return true;
//   else if (output.includes("INFO | - Total Interactions:")) return true;
//   else if (output.includes("INFO | - Total Crashes:")) return true;
//   else if (output.includes("INFO | - Total Successful Scraped Users:"))
//     return true;
//   else if (
//     output.includes("INFO | At last one of these limits has been reached:")
//   )
//     return true;
//   else return false;
// };

export function transferChildProcessOutput(
  cmd: ChildProcessWithoutNullStreams,
  connection: Socket,
  emitType: EmitTypes
) {
  cmd.stdout.on("data", (chunk: string | Buffer) => {
    const chunkString = chunk.toString("utf-8");
    const fData: string = chunkString
      .split("\n")
      .map((line: string) => line)
      .join("\n");
    connection.emit<EmitTypes>(emitType, fData);
  });
  cmd.on("close", (code: number | null) => {
    console.log("[INFO] FINISHED.\nCODE : ", code);
  });
}
