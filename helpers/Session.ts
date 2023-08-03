import { Socket } from "socket.io";
import { EmitTypes, ServerActionSessionData } from "./Types";
import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { transferChildProcessOutput } from "./ServerActions";

// Get Session
export function getSession(data: ServerActionSessionData, connection: Socket) {
  if (!data.username || data.username.trim() === "") {
    connection.emit<EmitTypes>("get-session-message", "[ERROR] Can not read file when username is not provided");
    return;
  }
  const _path: string = path.join(process.cwd(), 'scripts', 'sessions.py');
  const command: string = "python";
  const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${_path}`, { shell: true });
  cmd.stdin.write(JSON.stringify(data));
  cmd.stdin.end();
  transferChildProcessOutput(cmd, connection, "get-session-message");
}

