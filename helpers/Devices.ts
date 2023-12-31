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


export const DevicesList = {
  "R7AT310MPTY": "A35",
  "R7AT310N6YN": "A05",
  "R7AT310NYTR": "A30",
  "R7AT310PKFE": "A04",
  "R7AT310PLGR": "A32",
  "R7ST219J65W": "A42",
  "R7ST30TVVJE": "A19",
  "R7ST30TYCHE": "A46",
  "R7ST31L8DWN": "A52",
  "R7ST405K7PP": "A44",
  "R9YT805BYNL": "C08",
  "R9ZW305K35M": "A47",
  "R9ZW305LMXN": "A45",
  "R7AT310FTBJ": "A10",
  "R7AT310J26E": "C07",
  "R7AT310P7AV": "A18",
  "R7AT310P7CM": "A17",
  "R7AT310PHJB": "A21",
  "R7AT310PJ4L": "B18",
  "R7AT310Q48H": "B07",
  "R7AT310Q98N": "A33",
  "R7AT310QB5L": "A08",
  "R7AT41BHF2H": "B21",
  "R7SRC1WTKFA": "B01",
  "R7ST11J1XDH": "B02",
  "R7ST12LK1QJ": "A34",
  "R7ST30TZN5V": "A37",
  "R7ST30V0XHR": "A13",
  "R7ST31L8K5H": "A48",
  "R7ST405M05E": "A41",
  "R7STB0PS5AA": "B05",
  "R9ZW305EN4B": "A53",
  "R7ARC1FVTMT": "C03",
  "R7AT310HPTF": "A23",
  "R7AT310JNGZ": "C02",
  "R7AT310NHRE": "A39",
  "R7AT310NZMK": "A50",
  "R7AT310P8AB": "B19",
  "R7AT310PDHN": "A06",
  "R7AT310PDQK": "A03",
  "R7AT310PE1N": "B06",
  "R7AT310PE5A": "A49",
  "R7AT310PHMV": "B03",
  "R7AT310Q2VP": "A09",
  "R7AT310Q61D": "A12",
  "R7AT310QMVP": "A43",
  "R7SRC1WCBCD": "B04",
  "R7ST10KG7NK": "C06",
  "R7ST12LG1QF": "A51",
  "R7ST21604JR": "B22",
  "R7ST30TZZ0J": "A31",
  "R7ST30V31RK": "A22",
  "R7ST30V5MHT": "C04",
  "R7ST31LD00J": "A14",
  "R7ST405LHQV": "B20",
  "R7ST405MD7M": "A07",
  "R7ST405MTZP": "A20",
  "R7ST405PFVZ": "B23",
  "R9RTB05MR3Y": "A15",
  "R9ZW305K08Z": "B24",
  }

