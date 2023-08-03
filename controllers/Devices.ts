import { Socket } from "socket.io";
import { EmitTypes, EventTypes } from "../helpers/Types";
import { Device } from "../helpers/classes/Device";
import { spawn } from "node:child_process";
import os from "node:os";

const devices: Device[] = [];

const DevicesList = {
  "R9ZW305K08Z": "A01",
  "R7AT310QB5L": "A02",
  "R7ST405PFVZ": "A03",
  "R7AT310PKFE": "A04",
  "R7AT310N6YN": "A05",
  "R7AT310PDHN": "A06",
  "R7ST405MD7M": "A07",
  "R7AT310PE5A": "A08",
  "R7ST31LDCJH": "B09",
  "R7AT310PDQK": "A10",
  "R7AT310MW0F": "A11",
  "R7AT310Q61D": "A12",
  "R7ST30V0XHR": "A13",
  "R7ST31LD00J": "B14",
  "R7AT310HMKH": "A15",
  "R7ST405K51K": "A16",
  "R7AT310P7CM": "A17",
  "R9YT805BYNL": "A18",
  "R7AT310P7AV": "A19",
  "R7ST405MTZP": "A20",
  "R7SRC1WTKFA": "B21",
  "R7ST30V31RK": "A22",
  "R7AT310HPTF": "A23",
  "R7ST405PJGR": "A24",
  "R7ST30TVVJE": "C25",
  "R7AT310NYTR": "A30",
  "R7ST30TZZ0J": "A31",
  "R7AT310PLGR": "A32",
  "R7AT310Q98N": "A33",
  "R7ST12LK1QJ": "B34",
  "R7AT310MPTY": "A35",
  "R7AT310Q6PY": "A36",
  "R7ST30TZN5V": "A37",
  "R7AT310PHJB": "A38",
  "R7AT310NHRE": "A39",
  "R7ST30V5MHT": "A40",
  "R7ST405M05E": "A41",
  "R7AT310P8AB": "A42",
  "R7AT310QMVP": "A43",
  "R7ST405K7PP": "A44",
  "R7AT41BHF2H": "A45",
  "R7ST30TYCHE": "A46",
  "R7AT310J26E": "A47",
  "R7AT310FTBJ": "A48",
  "R7STB0PS5AA": "A49",
  "R7AT310NZMK": "A50",
  "R7ST12LG1QF": "A51",
  "R7ST31L8DWN": "A52",
  "R7AT30TZY2R": "A53",
  "ca2937e9": "A54",
}

export class Devices {
  private connections: Socket[];
  constructor() {
    this.connections = [];
  }

  add(connection: Socket) {
    this.connections.push(connection);
    // get one device
    connection.on<EventTypes>("get-device", (deviceId: string) => {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        connection.emit<EmitTypes>("get-device-message", "[ERROR] Device not found !");
        return;
      }
      else {
        connection.emit<EmitTypes>("get-device-message", device);
        return;
      }
    })

    // get all devices
    connection.on<EventTypes>("get-devices", () => {
      Object.entries(DevicesList).forEach(([key, value]: [key: string, value: string]) => {
        // get battery;
        const device: Device | undefined = devices.find((d: Device) => d.id === key && d.name === value);
        if (device && device.id && device.name) {
          const platformCommand: string = os.platform() === "win32" ? "findstr /i" : "egrep"
          const command = `adb -s ${key} shell dumpsys battery | ${platformCommand} "level: "`;
          const sh = spawn(command, { shell: true });
          sh.stdout.on("data", (data: string | Buffer) => {
            const d = data.toString('utf-8').replace('level: ', '').replace('\n', '').trim();
            devices.splice(devices.indexOf(device), 1);
            const _d: Device = new Device(key, value, `${d}%`, undefined);
            devices.push(_d);
          });
          return;
        }
        // create one
        const platformCommand: string = os.platform() === "win32" ? "findstr /i" : "egrep"
        const command = `adb -s ${key} shell dumpsys battery | ${platformCommand} "level: "`;
        const sh = spawn(command, { shell: true });
        sh.stdout.on("data", (data: string | Buffer) => {
          const d = data.toString('utf-8').replace('level: ', '').replace('\n', '').trim();
          const device: Device = new Device(key, value, `${d}%`, undefined);
          devices.push(device);
        });
      });
      setTimeout(() => {
        connection.emit<EmitTypes>("get-devices-message", devices)
      }, 300);
      return;
    });
  }
}

