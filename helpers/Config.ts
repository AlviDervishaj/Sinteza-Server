import { Socket } from "socket.io";
import { EmitTypes } from "./Types";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { transferChildProcessOutput } from "./ServerActions";

// Read Config
export function readConfig(username: string, connection: Socket) {
  if (username.trim() === "" || !username) {
    connection.emit<EmitTypes>("read-config-message", "[ERROR] Username is not valid.");
    return;
  }
  const command: string = "python";
  const cmd: ChildProcessWithoutNullStreams = spawn(command,
    [path.join(process.cwd(), 'scripts', 'read_config.py')],
    { shell: true }
  );
  cmd.stdin.write(username);
  cmd.stdin.end();
  transferChildProcessOutput(cmd, connection, "read-config-message");
}

