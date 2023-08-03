import { Socket } from "socket.io";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { transferChildProcessOutput } from "./ServerActions";
import { EmitTypes } from "./Types";

// Preview Device
export function previewDevice(deviceId: string, connection: Socket) {
  if (!deviceId || deviceId.trim() === "") {
    connection.emit<EmitTypes>("preview-device-message", "[ERROR] Can not preview device when id is not provided !");
    return;
  }
  const cmd: ChildProcessWithoutNullStreams = spawn(`scrcpy -s ${deviceId}`, { shell: true });
  transferChildProcessOutput(cmd, connection, "preview-device-message");
}



// Get Devices
export function getDevices(connection: Socket) {
  const cmd: ChildProcessWithoutNullStreams = spawn("adb devices", { shell: true });
  transferChildProcessOutput(cmd, connection, "preview-device-message");
}


