import { Socket } from "socket.io";
import type { BotFormData, EmitTypes } from "./Types";
import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { transferChildProcessOutput } from "./ServerActions";
import dayjs from "dayjs";
import os from "node:os";
import { readFile, writeFile } from "node:fs";
import { Process } from "./classes/Process";

// Delete Older Logs
export function deleteOlderLogs(username: string, connection: Socket) {
  const month: string = dayjs().format("MM");
  const date: string = dayjs().format("DD");
  const format: string = `[${month}/${date}`;
  const _logPath: string = path.join(process.cwd(), 'logs', `${username}.log`)
  // read username.log file
  try {
    readFile(_logPath, "utf8", (_, data) => {
      const lines = data.split("\n");
      const rewrite = lines.map((line: string) => {
        return line.startsWith(format) ? line : null;
      }).filter((l: string | null) => l !== null);
      // // write new content to file
      writeFile(_logPath, rewrite.length > 0 ? rewrite.join("\n") : "", (err) => {
        if (err) {
          console.log({ err });
          connection.emit<EmitTypes>("delete-older-logs-message", "[ERROR] Something unexpected happened while deleting older logs !")
          return;
        }
        else {
          connection.emit<EmitTypes>("delete-older-logs-message", "Deleted older files !")
          return;
        }
      });
    });
  }
  catch (err) {
    console.log(err);
    connection.emit<EmitTypes>("delete-older-logs-message",)
    return;
  }
}

// Get Config
export function getProcessConfig(username: string, connection: Socket) {
  if (!username || username.trim() === "") {
    connection.emit<EmitTypes>("get-config-message", "[ERROR] Can not read file when username is not provided");
    return;
  }
  const _path: string = path.join(process.cwd(), 'scripts', 'get_config.py');
  const command: string = os.platform() === "win32" ? "python" : "python3";
  const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${_path}`, { shell: true });
  cmd.stdin.write(username);
  cmd.stdin.end();
  transferChildProcessOutput(cmd, connection, "get-config-message");
}

// Get Process ID
export function getProcessPid(username: string, connection: Socket) {
  if (!username || username.trim() === "") {
    connection.emit<EmitTypes>("get-pid-message", "[ERROR] Can not get process when username is not provided");
    return;
  }
  const _path: string = path.join(process.cwd(), 'Bot', 'run.py');
  const spawnedArgs: string = `--config ${path.join(process.cwd(),
    'accounts', username, 'config.yml')}`
  const command = os.platform() === "win32" ? 'tasklist | findstr /i' : 'ps -aux | egrep';
  const pythonCommand = os.platform() === "win32" ? 'python.exe' : 'python3';
  const cmd: ChildProcessWithoutNullStreams = spawn(`${command} "${pythonCommand} ${_path} ${spawnedArgs}" `, { shell: true });
  // stream data 
  transferChildProcessOutput(cmd, connection, "get-pid-message");
}

// Terminate Process
export function terminateProcess(pid: string, connection: Socket) {
  if (!pid) {
    connection.emit<EmitTypes>("terminate-process-message", "[ERROR] Can not kill bot when pid is not provided");
    return;
  }
  else {
    const command = os.platform() === "win32" ? 'taskkill /F /PID' : 'kill -9';
    const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${pid}`, { shell: true });
    transferChildProcessOutput(cmd, connection, "terminate-process-message");
  }
}

// Start Bot Checks
export function startBotChecks(data: BotFormData, _process: Process): void {
  const command: string = os.platform() === "win32" ? "python" : "python3";
  const cmd = spawn(`${command} ${path.join(process.cwd(), 'scripts', 'start_bot_checks.py')}`,
    { shell: true });
  console.log(path.join(process.cwd(), 'scripts', 'start_bot_checks.py'));
  const { device, ...rest } = data;
  const id: string = device._id;
  cmd.stdin.write(JSON.stringify({ device: id, ...rest }));
  cmd.stdin.end()
  cmd.stderr.on("data", (chunk: string | Buffer) => {
    console.log(`Stderr data : ${chunk.toString('utf-8')}`);
  })
  cmd.stdout.on("data", (chunk: string | Buffer) => {
    const chunkString = chunk.toString("utf-8");
    const fData: string = chunkString
      .split("\n")
      .map((line: string) => line)
      .join("\n");
    if (_process.result.includes(fData)) return;
    else _process.result += fData;
  });
  cmd.on("close", (code: number | null) => {
    console.log("[INFO] FINISHED.\nCODE : ", code);
  });
}
