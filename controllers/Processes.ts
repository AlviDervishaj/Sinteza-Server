import {
  ChildProcessWithoutNullStreams,
  ExecException,
  exec,
  spawn,
  execSync,
} from "node:child_process";
import { chunks } from "../helpers/generator";
import { Socket } from "socket.io";
import {
  ConfigNames,
  ConfigRows,
  BulkWriteData,
  ConfigRowsSkeleton,
  CreateProcessData,
  EmitTypes,
  EventTypes,
  SessionConfigSkeleton,
  SessionProfileSkeleton,
  ProcessSkeleton,
  ServerActionSessionData,
  WorkerSessions,
} from "../helpers/Types";
import {
  checkBotFinished,
  checkOutputCrashes,
  checkOutputCritical,
  checkOutputErrors,
  checkOutputLogs,
  checkOutputSleeping,
  checkOutputWarnings,
} from "../helpers/ServerActions";
import os from "node:os";
import { Process } from "../helpers/classes/Process";
import { startBotChecks } from "../helpers/Processes";
import path from "node:path";
import { Device } from "../helpers/classes/Device";
import { DevicesList } from "../helpers/Devices";
import { clearTimeout } from "node:timers";
import { Worker } from "node:worker_threads";
import { readFileSync } from "node:fs";

// Processes
export class Processes {
  // list of connections
  private connections: Socket[];
  // a pid and process username mapping
  private relations: Map<string, string>;
  // a name and result mapping
  private results: Map<string, string | undefined>;
  private processes: Process[] = [];
  private devices: Device[] = [];
  private schedules: Map<string, NodeJS.Timeout>;
  private names: Map<string, "RUNNING" | "WAITING" | "STOPPED" | "FINISHED">;
  private sessions: Map<string, ConfigRowsSkeleton>;

  // handle process schedule
  handleProcessSchedule = (data: CreateProcessData): void => {
    const _process = new Process(
      data.formData.device,
      data.formData.username,
      data.membership,
      data.status,
      "",
      0,
      0,
      0,
      ConfigRows,
      SessionConfigSkeleton,
      SessionProfileSkeleton,
      0,
      data.scheduled,
      data.jobs,
      "config.yml",
      Date.now()
    );
    this.processes.push(_process);
    const timeout: NodeJS.Timeout = setTimeout(() => {
      // process added to pool, now start it
      startBotChecks(data.formData, _process);
      // start it
      const command: string = os.platform() === "win32" ? "python" : "python3";
      const _startBotData: { username: string; config_name: ConfigNames } = {
        username: _process.username,
        config_name: _process.configFile,
      };
      const cmd: ChildProcessWithoutNullStreams = spawn(
        `${command} ${path.join(process.cwd(), "scripts", "start_bot.py")}`,
        { shell: true }
      );
      cmd.stdin.write(JSON.stringify(_startBotData));
      cmd.stdin.end();
      cmd.stdout.on("data", (chunk: string | Buffer) => {
        const output = chunk
          .toString("utf-8")
          .split("\n")
          .map((line: string) => line)
          .join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        this.processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          } else return proc;
        });
        this.names.set(_process.username, _process.status);
      });
      cmd.stderr.on("data", (chunk: string | Buffer) => {
        const output = chunk
          .toString("utf-8")
          .split("\n")
          .map((line: string) => line)
          .join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        this.names.set(_process.username, _process.status);
      });
      this.sessions.set(_process.username, _process.session);
      this.processes.map((_p: Process) =>
        _p.username === _process.username ? _process : _p
      );
    }, data.startsAt);
    this.schedules.set(_process.username, timeout);
    return;
  };

  checkIsStopped(username: string): boolean {
    // start process again.
    // check if process exists
    const prevProcess: Process | undefined = this.processes.find(
      (p: Process) => p.username === username
    );
    // check its status
    if (prevProcess) {
      if (
        prevProcess.status === "WAITING" ||
        prevProcess.status === "RUNNING"
      ) {
        return false;
      }
      return true;
    }
    return true;
  }

  handleCreateProcess(data: CreateProcessData): void {
    const _process = new Process(
      data.formData.device,
      data.formData.username,
      data.membership,
      data.status,
      "",
      0,
      0,
      0,
      ConfigRows,
      SessionConfigSkeleton,
      SessionProfileSkeleton,
      0,
      data.scheduled,
      data.jobs,
      "config.yml",
      Date.now()
    );
    // process added to pool, now start it
    // eslint-disable-next-line prefer-const
    startBotChecks(data.formData, _process);
    setTimeout(() => {
      // start it
      const command: string = os.platform() === "win32" ? "python" : "python3";
      const cmd: ChildProcessWithoutNullStreams = spawn(
        `${command} ${path.join(process.cwd(), "scripts", "start_bot.py")}`,
        { shell: true }
      );
      const _startBotData = {
        username: _process.username,
        config_name: _process.configFile,
      };
      cmd.stdin.write(JSON.stringify(_startBotData));
      cmd.stdin.end();
      cmd.stderr.on("data", (chunk: string | Buffer) => {
        const output = chunk
          .toString("utf-8")
          .split("\n")
          .map((line: string) => line)
          .join("\n");
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        this.processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          } else return proc;
        });
        this.names.set(_process.username, _process.status);
      });
      cmd.stdout.on("data", (chunk: string | Buffer) => {
        const output = chunk
          .toString("utf-8")
          .split("\n")
          .map((line: string) => line)
          .join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        this.processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          } else return proc;
        });
        this.names.set(_process.username, _process.status);
      });
      this.sessions.set(_process.username, _process.session);
      this.processes.push(_process);
      return;
    }, 200);
  }

  constructor() {
    this.connections = [];
    this.relations = new Map<string, string>();
    this.results = new Map<string, string | undefined>();
    this.devices = [];
    this.schedules = new Map<string, NodeJS.Timeout>();
    this.names = new Map<
      string,
      "RUNNING" | "WAITING" | "STOPPED" | "FINISHED"
    >();
    this.sessions = new Map<string, ConfigRowsSkeleton>();
  }

  // Add connection and event listeners
  add(connection: Socket) {
    this.connections.push(connection);
    // Start bot again
    connection.on<EventTypes>(
      "start-process-again",
      (data: CreateProcessData) => {
        const _process = new Process(
          data.formData.device,
          data.formData.username,
          data.membership,
          "RUNNING",
          "",
          0,
          0,
          0,
          ConfigRows,
          SessionConfigSkeleton,
          SessionProfileSkeleton,
          0,
          data.scheduled,
          data.jobs,
          "config.yml",
          Date.now()
        );
        const result: boolean = this.checkIsStopped(_process.username);
        if (result) {
          // remove process from pool
          const proc: Process | undefined = this.processes.find(
            (_p: Process) => _p.username === _process.username
          );
          if (proc) {
            this.processes.splice(this.processes.indexOf(proc), 1);
          }
          const command: string =
            os.platform() === "win32" ? "python" : "python3";
          const cmd: ChildProcessWithoutNullStreams = spawn(
            `${command} ${path.join(process.cwd(), "scripts", "start_bot.py")}`,
            { shell: true }
          );
          const _startBotData = {
            username: _process.username,
            config_name: _process.configFile,
          };
          cmd.stdin.write(JSON.stringify(_startBotData));
          cmd.stdin.end();
          this.names.set(_process.username, _process.status);
          this.sessions.set(_process.username, _process.session);
          this.processes.push(_process);
          setTimeout(() => {
            connection.emit<EmitTypes>(
              "start-process-again-message",
              "Success."
            );
          }, 1000 * 1.3);
        } else {
          setTimeout(() => {
            connection.emit<EmitTypes>(
              "start-process-again-message",
              "[ERROR] Process is running !"
            );
          }, 1000 * 1.3);
        }
        return;
      }
    );

    // Remove Schedule
    connection.on<EventTypes>("remove-schedule", (_username: string) => {
      if (this.schedules.has(_username)) {
        const proc: Process | undefined = this.processes.find(
          (_p: Process) => _p.username === _username
        );
        if (proc) {
          clearTimeout(this.schedules.get(_username));
          proc.status = "STOPPED";
          proc.scheduled = false;
          this.names.set(_username, "STOPPED");
          this.schedules.delete(_username);
          this.processes.splice(this.processes.indexOf(proc), 1);
          this.processes.push(proc);
          connection.emit<EventTypes>(
            "remove-schedule",
            `[INFO] Removed schedule for ${_username}`
          );
          return;
        }
        connection.emit<EventTypes>(
          "remove-schedule",
          `[ERROR] Could not find bot for ${_username}`
        );
        return;
      } else {
        connection.emit<EventTypes>(
          "remove-schedule",
          "[INFO] Bot is not scheduled !"
        );
        return;
      }
    });
    // Create multiple processes
    connection.on<EventTypes>("create-processes", (data: BulkWriteData) => {
      if (data.formData.usernames.length === 0)
        return connection.emit<EmitTypes>(
          "create-processes-message",
          "[ERROR] No usernames provided !"
        );
      if (data.formData.devices.length === 0)
        return connection.emit<EmitTypes>(
          "create-processes-message",
          "[ERROR] No devices provided !"
        );
      if (data.formData.usernames.length !== data.formData.devices.length)
        return connection.emit<EmitTypes>(
          "create-processes-message",
          "[ERROR] Usernames and devices length does not match !"
        );
      if (data.formData.usernames.length !== data.membership.length)
        return connection.emit<EmitTypes>(
          "create-processes-message",
          "[ERROR] Usernames and memberships length does not match !"
        );

      // check if process already exists
      const proc: Process | undefined = this.processes.find(
        (_p: Process) => _p.username === data.formData.usernames[0]
      );
      if (proc) {
        // process exists
        this.processes.splice(this.processes.indexOf(proc), 1);
      }
      // worker action here
      const toBeCreated: number = data.formData.usernames.length;
      const _ps_: CreateProcessData[] = [];
      for (let i = toBeCreated; i > 0; i--) {
        const obj: CreateProcessData = {
          scheduled: false,
          startsAt: undefined,
          startTime: undefined,
          status: "RUNNING",
          membership: data.membership[toBeCreated - i],
          jobs: data.formData.jobs,
          formData: {
            username: data.formData.usernames[toBeCreated - i],
            device: data.formData.devices[toBeCreated - i],
            jobs: data.formData.jobs,
            config_name: data.formData.config_name,
            "speed-multiplier": data.formData["speed-multiplier"],
            "truncate-sources": data.formData["truncate-sources"],
            "blogger-followers": data.formData["blogger-followers"],
            "hashtag-likers-top": data.formData["hashtag-likers-top"],
            "working-hours": data.formData["working-hours"],
          },
        };
        _ps_.push(obj);
      }
      const _threads: number = 3;
      const _chunks: CreateProcessData[][] = [...chunks(_ps_, _threads)];
      // split array into chunks
      for (let i = _threads; i > 0; i--) {
        _chunks.push(_ps_.splice(0, Math.ceil(_ps_.length / i)));
      }
      _chunks.forEach((data: CreateProcessData[]) => {
        const worker = new Worker("./workers/start_worker.js", {
          workerData: {
            path: "./workers/start_worker.ts",
            data: JSON.stringify(data),
          },
        });
        worker.on("message", (result: { processes: ProcessSkeleton[] }) => {
          result.processes.map((p: ProcessSkeleton) => {
            const _process: Process = new Process(
              {
                _id: p._device.id,
                _name: p._device.name,
                _battery: p._device.battery,
              },
              p._user.username,
              p._user.membership,
              "RUNNING",
              "",
              0,
              0,
              0,
              ConfigRows,
              SessionConfigSkeleton,
              SessionProfileSkeleton,
              0,
              p._scheduled,
              p._jobs,
              p._configFile,
              Date.now()
            );
            // check if process already exists
            const proc: Process | undefined = this.processes.find(
              (_p: Process) => _p.username === _process.username
            );
            // set status in map
            this.names.set(_process.username, _process.status);
            if (proc) {
              // update process
              this.processes.map((p: Process) => {
                if (p.username === _process.username) {
                  p = _process;
                }
                return p;
              });
            } else {
              // add it to pool if it does not exits
              this.processes.push(_process);
            }
          });
        });
      });

      setTimeout(() => {
        connection.emit<EmitTypes>(
          "create-processes-message",
          "[INFO] Crated processes."
        );
      }, 1000 * 4);
    });

    // Get All Processes
    connection.on<EventTypes>("get-processes", () => {
      if (this.processes.length === 0) {
        connection.emit<EmitTypes>("get-processes-message", []);
        return;
      }
      this.processes.map((p: Process) => {
        const _logPath: string = path.join(
          process.cwd(),
          "accounts",
          p.username,
          `${p.username}.log`
        );
        // read username.log file
        try {
          const data: string = readFileSync(_logPath, "utf8");
          this.results.set(p.username, data);
          data
            .split("\n")
            .map((line: string) => line)
            .forEach((line: string) => {
              if (line.trim() === "") return;
              else if (line.includes("Next session will start at:")) {
                p.status = "WAITING";
                return;
              } else if (line.includes(`Hello`)) {
                const c = line.split(" ").filter((el) => el);
                const followers = parseInt(c[6]);
                const following = parseInt(c[9]);
                p.followers = followers;
                p.following = following;
                return;
              } else if (line.includes("Total Crashes: 1/5")) {
                p.total_crashes = 1;
                return;
              } else if (line.includes("Finished.")) {
                p.status = "FINISHED";
                return;
              } else if (line.includes("ERROR | Reached crashes limit.")) {
                p.status = "STOPPED";
                return;
              } else if (line.includes("Total Crashes: 2/5")) {
                p.total_crashes = 2;
                return;
              } else if (line.includes("Total Crashes: 3/5")) {
                p.total_crashes = 3;
                return;
              } else if (line.includes("Total Crashes: 4/5")) {
                p.total_crashes = 4;
                return;
              } else if (line.includes("Total Crashes: 5/5")) {
                p.total_crashes = 5;
                return;
              } else if (
                line.includes(
                  "This kind of exception will stop the bot (no restart)."
                )
              ) {
                p.total_crashes = 5;
                return;
              } else if (line.includes("RuntimeError: USB device")) {
                p.total_crashes = 5;
                p.status = "STOPPED";
                return;
              } else if (line.includes("adbutils.errors.AdbError: device")) {
                p.total_crashes = 5;
                p.status = "STOPPED";
                return;
              } else return;
            });
          p.result = data;
        } catch (err) {
          console.log(err);
        }
        return p;
      });
      setTimeout(() => {
        connection.emit<EmitTypes>("get-processes-message", this.processes);
        return;
      }, 1000 * 1);
    });

    // Get Devices Battery
    connection.on<EventTypes>("get-devices-battery", () => {
      this.processes.map((_process: Process) => {
        const platformCommand: string =
          os.platform() === "win32" ? "findstr /i" : "egrep";
        const c = `adb -s ${_process.device.id} shell dumpsys battery | ${platformCommand} "level: "`;
        exec(c, (error: ExecException | null, stdout: string) => {
          if (error) {
            if (error.message.includes("device offline")) {
              _process.device.battery = "X";
              // set process to crashed.
              _process.status = "STOPPED";
              _process.total_crashes = 5;
              return;
            }
            return;
          }
          if (stdout.includes(`device '${_process.device.id}' not found`)) {
            _process.device.battery = "X";
            return;
          }
          _process.device.battery = `${stdout.trim().split(":")[1]}%`.trim();
          return;
        });
        return _process;
      });
    });

    // Create Process
    connection.on<EventTypes>("create-process", (data: CreateProcessData) => {
      if (data.formData.username === "")
        return connection.emit<EmitTypes>(
          "create-process-message",
          "[ERROR] Username cannot be empty !"
        );
      if (typeof data.formData.device === "undefined")
        return connection.emit<EmitTypes>(
          "create-process-message",
          "[ERROR] Device cannot be empty !"
        );
      if (this.names.has(data.formData.username)) {
        if (
          this.names.get(data.formData.username) === "RUNNING" ||
          this.names.get(data.formData.username) === "WAITING"
        ) {
          connection.emit<EmitTypes>(
            "create-process-message",
            "[ERROR] Process is already running..."
          );
          return;
        }
      }
      // check device if it is running another process
      const _device: Device | undefined = this.devices.find(
        (d: Device) => d.id === data.formData.device._id
      );
      if (_device) {
        if (_device.process) {
          connection.emit<EmitTypes>(
            "create-process-message",
            "[ERROR] Device is already running another process..."
          );
          return;
        }
      }

      if (data.scheduled) {
        const p: Process | undefined = this.processes.find(
          (p) => p.username === data.formData.username
        );
        if (p) {
          // process exists
          this.processes.splice(this.processes.indexOf(p), 1);
        }
        this.handleProcessSchedule(data);
        connection.emit<EmitTypes>(
          "create-process-message",
          "[INFO] Scheduled process."
        );
      } else {
        this.handleCreateProcess(data);
        connection.emit<EmitTypes>(
          "create-process-message",
          "[INFO] Created Process."
        );
      }
    });

    // Remove process
    connection.on<EventTypes>("remove-process", (_username: string) => {
      if (this.names.has(_username)) {
        if (
          this.names.get(_username) === "RUNNING" ||
          this.names.get(_username) === "WAITING"
        ) {
          connection.emit<EmitTypes>(
            "create-process-message",
            "[ERROR] Process is already running..."
          );
          return;
        }
      }
      const p: Process | undefined = this.processes.find(
        (p) => p.username === _username
      );
      if (p) {
        // process exists
        this.processes.splice(this.processes.indexOf(p), 1);
        connection.emit<EmitTypes>(
          "remove-process-message",
          "[INFO] Process removed."
        );
        return;
      }
      // process does not exist
      else {
        connection.emit<EmitTypes>(
          "remove-process-message",
          "[ERROR] Could not find process."
        );
        return;
      }
    });

    // Get Sessions
    connection.on<EventTypes>("get-sessions", () => {
      // spawn workers here
      const _threads: number = 3;
      const _ps_: ServerActionSessionData[] = [];
      for (const process of this.processes) {
        // create data
        const data: ServerActionSessionData = {
          username: process.username,
          followers_now: process.followers,
          following_now: process.following,
        };
        _ps_.push(data);
      }
      const _chunks: ServerActionSessionData[][] = [...chunks(_ps_, _threads)];
      for (let i = _threads; i > 0; i--) {
        _chunks.push(_ps_.splice(0, Math.ceil(_ps_.length / i)));
      }
      _chunks.forEach((data: ServerActionSessionData[]) => {
        const worker = new Worker("./workers/get_session.js", {
          workerData: {
            path: "./workers/get_session.ts",
            data,
          },
        });
        worker.on("message", (result: Array<WorkerSessions>) => {
          this.processes.map((p: Process) => {
            const _session_: WorkerSessions | undefined = result.find(
              (session: WorkerSessions) => session.username === p.username
            );
            if (_session_) {
              p.session = _session_.session
                ? _session_.session
                : {
                    ...ConfigRows,
                    id: "",
                    "overview-username": p.username,
                    "overview-status": p.status,
                    "overview-followers": p.followers.toString(),
                    "overview-following": p.following.toString(),
                  };
            }
          });
        });
      });

      setTimeout(() => {
        connection.emit<EmitTypes>(
          "get-sessions-message",
          "[INFO] Got sessions."
        );
      }, 1000 * 3.7);
    });

    // Stop process
    connection.on<EventTypes>("stop-process", (_username: string) => {
      const p = this.processes.find(
        (process) => process.username === _username
      );
      if (p) {
        try {
          // kill atx agent and disconnect device
          execSync(`python ./Bot/turn_off_screen.py ${p.device.id}`);
          setTimeout(() => {
            execSync(`python ./Bot/turn_off_screen.py ${p.device.id}`);
          }, 1000 * 2.1);
          execSync(`python ./Bot/turn_off_screen.py ${p.device.id}`);
        } catch (e) {
          console.log({ e });
          connection.emit<EmitTypes>(
            "stop-process-message",
            "[ERROR] Something unexpected happened."
          );
          return;
        }
        this.processes.map((_p: Process) => {
          if (p.username === _p.username) {
            _p.status = "STOPPED";
          }
        });
        this.names.set(_username, "STOPPED");
        this.relations.delete(_username);
        connection.emit<EmitTypes>(
          "stop-process-message",
          "[INFO] Stopped process"
        );
        return;
      } else {
        connection.emit<EmitTypes>(
          "stop-process-message",
          "[ERROR] Could not find process. Maybe refresh page ?"
        );
        return;
      }
    });

    // Get Device
    connection.on<EventTypes>("get-device", (deviceId: string) => {
      const device = this.devices.find((d) => d.id === deviceId);
      if (device) {
        connection.emit<EmitTypes>(
          "get-device-message",
          "[ERROR] Device not found !"
        );
        return;
      } else {
        connection.emit<EmitTypes>("get-device-message", device);
        return;
      }
    });

    // Get all devices
    connection.on<EventTypes>("get-devices", () => {
      let output: string = "";
      spawn("adb devices", { shell: true }).stdout.on(
        "data",
        (_output: string | Buffer) => {
          output = _output
            .toString("utf-8")
            .replace("List of devices attached", "")
            .replace("device", "")
            .replace("\t", "");
          return;
        }
      );
      setTimeout(() => {
        const ids: string[] = output
          .trim()
          .split("\n")
          .map((d) => {
            const temp = d.replace("\r", "");
            const _t_stripped_temp = temp.replace("\t", "");
            return _t_stripped_temp.replace("device", "");
          });
        const platformCommand: string =
          os.platform() === "win32" ? "findstr /i" : "egrep";
        ids.map((id: string) => {
          Object.entries(DevicesList).forEach(
            ([key, value]: [key: string, value: string]) => {
              if (this.devices.find((_d: Device) => _d.id === key)) return;
              if (key === id) {
                // command to get battery
                const command = `adb -s ${key} shell dumpsys battery | ${platformCommand} "level: "`;
                let _battery: string = "X";
                // get device battery
                exec(command, (error: ExecException | null, stdout: string) => {
                  if (error) {
                    console.log({ error });
                    return;
                  }
                  if (stdout.includes(`device '${key}' not found`)) {
                    _battery = "X";
                  } else _battery = `${stdout.trim().split(":")[1]}%`.trim();
                });
                const a: Process | undefined = this.processes.find(
                  (_p: Process) =>
                    _p.device.id === key && _p.device.name === value
                );
                this.devices.push(
                  new Device(
                    key,
                    value,
                    _battery,
                    a
                      ? { username: a.username, configFile: a.configFile }
                      : null
                  )
                );
              }
            }
          );
        });
      }, 100);
      setTimeout(() => {
        connection.emit<EmitTypes>("get-devices-message", this.devices);
      }, 300);
      return;
    });

    connection.on<EventTypes>("preview-device", (deviceId: string) => {
      const cmd: ChildProcessWithoutNullStreams = spawn(`scrcpy -s ${deviceId}`, {
        shell: true,
      });
      setTimeout(() => {
        connection.emit<EmitTypes>("preview-device-message", this.devices);
      }, 300);
    })
    // handle close event
    connection.on("close", () => {
      connection.disconnect();
      this.connections.splice(this.connections.indexOf(connection), 1);
    });
  }
}
