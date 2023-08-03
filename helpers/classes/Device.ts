import { Process } from "./Process";

export type DeviceType = {
  id: string;
  name: string;
  process?: Process;
  battery: string;
}

export class Device {
  private _id: string;
  private _name: string;
  private _battery: string;
  private _process: Process | undefined;

  constructor(id: string, name: string, battery: string, process?: Process) {
    this._id = id;
    this._name = name;
    this._battery = battery;
    this._process = process;
  }

  get id(): string {
    return this._id;
  }
  get battery(): string {
    return this._battery;
  }

  get process(): Process | undefined {
    return this._process;
  }
  get name(): string {
    return this._name;
  }

  add(_device: DeviceType): DeviceType {
    this._id = _device.id;
    this._name = _device.name;
    this._process = _device.process;
    this._battery = _device.battery;
    return { id: this._id, name: this._name, process: this._process, battery: this._battery };
  }
}
