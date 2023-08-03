import { Socket } from "socket.io";
import { EmitTypes } from "./Types";
import path from "node:path";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { transferChildProcessOutput } from "./ServerActions";

// Send Status to Telegram
export function sendStatusToTelegram(username: string, connection: Socket) {
  if (!username || username.trim() === "") {
    connection.emit<EmitTypes>("send-status-to-telegram-message", "[ERROR] Can not send status to telegram when username is not provided");
    return;
  }
  const _path: string = path.join(process.cwd(), 'scripts', 'send_data_to_telegram.py');
  const command: string = "python";
  const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${_path}`, { shell: true });
  cmd.stdin.write(username);
  cmd.stdin.end();
  transferChildProcessOutput(cmd, connection, "send-status-to-telegram-message");
}

