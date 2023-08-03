import { ChildProcessWithoutNullStreams } from "node:child_process";
import { Socket } from "socket.io";
import { EmitTypes } from "./Types";

export const checkOutputSleeping = (output: string) => {
  if (output.includes("INFO | Next session will start at:")) return true;
  else return false;
};

export const checkOutputLogs = (output: string) => {
  if (output.includes("INFO | Hello, @")) return true;
  else if (output.includes("INFO | Profile was not fully loaded")) return true;
  else if (output.includes("IndexError: list index out of range")) return true;
  else if (output.includes("INFO | SESSION")) return true;
  else if (output.includes("INFO | Start time:")) return true;
  else if (output.includes("INFO | Finish time:")) return true;
  else if (output.includes("INFO | Duration")) return true;
  else if (output.includes("INFO | You have logged out from")) return true;
  else if (output.includes("INFO | -------- START:")) return true;
  else if (output.includes("scheduled for this session")) return true;
  else if (output.includes("INFO | Current active-job: ")) return true;
  else if (output.includes("INFO | Completed sessions:")) return true;
  else if (output.includes("INFO | TOTAL")) return true;
  else if (output.includes("INFO | Total duration:")) return true;
  else if (output.includes("INFO | Total interactions:")) return true;
  else if (output.includes("INFO | Total followed:")) return true;
  else if (output.includes("INFO | Total likes:")) return true;
  else if (output.includes("INFO | Total comments:")) return true;
  else if (output.includes("INFO | Total PM sent:")) return true;
  else if (output.includes("INFO | Total watched:")) return true;
  else if (output.includes("INFO | Total unfollowed:")) return true;
  else return false;
};

export const checkOutputErrors = (output: string) => {
  if (output.includes("ERROR | Probably block dialog is shown")) return true;
  else if (output.includes("ERROR | Can't unlock your screen.")) return true;
  else if (output.includes("ERROR | Something is keeping closing IG APP. Please check your logcat to understand the reason! `adb logcat`")) return true;
  else if (output.includes("ERROR | Cannot get followers count text")) return true;
  else if (output.includes("ERROR | Cannot get following count text")) return true;
  else if (output.includes("ERROR | Reached crashes limit.")) return true;
  else return false;
};

export const checkOutputWarnings = (output: string) => {
  if (output.includes("WARNING | ")) return true;
  else return false;
};

export const checkBotFinished = (output: string) => {
  if (output.includes("INFO | -------- FINISH:")) return true;
  else if (
    output.includes("INFO | This bot is backed with love by me for free")
  )
    return true;
  else return false;
};
export const checkOutputCritical = (output: string) => {
  if (output.includes("CRITICAL | ")) return true;
  else return false;
};

export const checkOutputCrashes = (output: string) => {
  if (output.includes(" INFO | - Total Crashes:				OK (1/5)")) {
    return true;
  } else if (output.includes(" INFO | - Total Crashes:				OK (2/5)")) {
    return true;
  } else if (output.includes(" INFO | - Total Crashes:				OK (3/5)")) {
    return true;
  } else if (output.includes(" INFO | - Total Crashes:				OK (4/5)")) {
    return true;
  } else if (output.includes(" INFO | - Total Crashes:				OK (5/5)")) {
    return true;
  } else if (
    output.includes("This kind of exception will stop the bot (no restart).")
  ) {
    return true;
  } else if (output.includes("RuntimeError: USB device")) {
    return true;
  } else if (output.includes("adbutils.errors.AdbError: device")) {
    return true;
  }
  else return false;
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

export function transferChildOutputWithConditions(
  cmd: ChildProcessWithoutNullStreams,
  connection: Socket,
  emitType: EmitTypes,
) {
  cmd.on("close", (code: number | null) => {
    console.log("[INFO] FINISHED.\nCODE : ", code);
  });

  cmd.stdout.on("data", (chunk: string | Buffer) => {
    const output = chunk.toString("utf-8");
    if (
      checkOutputCrashes(output) ||
      checkBotFinished(output) ||
      checkOutputWarnings(output) ||
      checkOutputErrors(output) ||
      checkOutputLogs(output) ||
      checkOutputSleeping(output) ||
      checkOutputCritical(output)
    ) {
      // remove empty lines 
      const fData = output.split("\n").map((line: string) => line).join("\n");
      connection.emit<EmitTypes>(emitType, fData)
    }
    else return;
  });
}

export function transferChildProcessOutput(
  cmd: ChildProcessWithoutNullStreams,
  connection: Socket,
  emitType: EmitTypes,
) {
  cmd.on("close", (code: number | null) => {
    console.log("[INFO] FINISHED.\nCODE : ", code);
  });
  cmd.stdout.on("data", (chunk: string | Buffer) => {
    const chunkString = chunk.toString("utf-8");
    const fData: string = chunkString
      .split("\n")
      .map((line: string) => line)
      .join("\n");
    connection.emit<EmitTypes>(emitType, fData)
  });
}
