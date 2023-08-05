export type DeviceType = {
  id: string;
  name: string;
  process: { username: string, configFile: string } | null;
  battery: string;
}

export class Device {
  private _id: string;
  private _name: string;
  private _battery: string;
  private _process: { username: string, configFile: string } | null;

  constructor(id: string, name: string, battery: string, process: { username: string, configFile: string } | null) {
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

  get process(): { username: string, configFile: string } | null {
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
