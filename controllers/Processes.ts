import { ChildProcessWithoutNullStreams, ExecException, exec, spawn, execSync } from "node:child_process";
import { Socket } from "socket.io";
import {
  ConfigNames,
  ConfigRows,
  BulkWriteData,
  ConfigRowsSkeleton,
  CreateProcessData,
  EmitTypes,
  EventTypes,
  ServerActionSessionData,
  SessionConfigSkeleton,
  SessionProfileSkeleton
} from "../helpers/Types";
import os from "node:os";
import { Process } from "../helpers/classes/Process";
import { startBotChecks } from "../helpers/Processes";
import path from "node:path";
import {
  checkBotFinished,
  checkOutputCrashes,
  checkOutputCritical,
  checkOutputErrors,
  checkOutputLogs,
  checkOutputSleeping,
  checkOutputWarnings
} from "../helpers/ServerActions";
import { Device } from "../helpers/classes/Device";
import { DevicesList } from "../helpers/Devices";
import { clearTimeout } from "node:timers";

export let processes: Process[] = [];
const devices: Device[] = [];
const schedules = new Map<string, NodeJS.Timeout>();
export const names = new Map<string, "RUNNING" | "WAITING" | "STOPPED" | "FINISHED">();

const sessions = new Map<string, ConfigRowsSkeleton>();

// Processes
export class Processes {
  // list of connections
  private connections: Socket[];
  // a cmd and process username mapping
  private relations: Map<string, string>;

  // handle process schedule
  handleProcessSchedule = (data: CreateProcessData) => {
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
      Date.now(),
    );
    processes.push(_process);
    const timeout: NodeJS.Timeout = setTimeout(() => {
      // process added to pool, now start it
      startBotChecks(data.formData, _process);
      // start it
      const command: string = os.platform() === "win32" ? "python" : "python3";
      const _startBotData: { username: string, config_name: ConfigNames } = { username: _process.username, config_name: _process.configFile };
      const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${path.join(process.cwd(),
        'scripts', 'start_bot.py',)
        }`,
        { shell: true }
      );
      cmd.stdin.write(JSON.stringify(_startBotData));
      cmd.stdin.end();
      cmd.stdout.on("data", (chunk: string | Buffer) => {
        const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          }
          else return proc;
        })
        names.set(_process.username, _process.status);
      });
      cmd.stderr.on("data", (chunk: string | Buffer) => {
        const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        names.set(_process.username, _process.status);
      });
      sessions.set(_process.username, _process.session);
      processes.map((_p: Process) => _p.username === _process.username ? _process : _p);
    }, data.startsAt);
    schedules.set(_process.username, timeout);
    return;
  }

  // update process
  updateProcesses(_process: Process) {
    processes = processes.filter((p: Process) => {
      if (
        p.username === _process.username &&
        p.device === _process.device
      ) {
        return _process;
      } else return p;
    })
  }

  handleStartProcessAgain(data: CreateProcessData) {
    if (names.has(data.formData.username)) {
      if (names.get(data.formData.username) === "STOPPED" || names.get(data.formData.username) === "FINISHED") {
        // start process again.
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
          data.formData.config_name,
          Date.now(),
        );
        processes = processes.filter((_proc: Process) => _proc.username !== data.formData.username)
        const command: string = os.platform() === "win32" ? "python" : "python3";
        const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${path.join(process.cwd(),
          'scripts', 'start_bot.py',)
          }`,
          { shell: true }
        );
        const _startBotData = { username: _process.username, config_name: _process.configFile };
        cmd.stdin.write(JSON.stringify(_startBotData));
        cmd.stdin.end();
        cmd.stderr.on("data", (chunk: string | Buffer) => {
          const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
          checkOutputCrashes(output, _process);
          checkBotFinished(output, _process);
          checkOutputWarnings(output, _process);
          checkOutputErrors(output, _process);
          checkOutputLogs(output, _process);
          checkOutputSleeping(output, _process);
          checkOutputCritical(output, _process);
          processes.map((proc: Process) => {
            if (proc.username === _process.username) {
              proc = _process;
            }
            else return proc;
          });
          names.set(_process.username, _process.status);
        });
        cmd.stdout.on("data", (chunk: string | Buffer) => {
          const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
          if (_process.result.includes(output)) return;
          checkOutputCrashes(output, _process);
          checkBotFinished(output, _process);
          checkOutputWarnings(output, _process);
          checkOutputErrors(output, _process);
          checkOutputLogs(output, _process);
          checkOutputSleeping(output, _process);
          checkOutputCritical(output, _process);
          processes.map((proc: Process) => {
            if (proc.username === _process.username) {
              proc = _process;
            }
            else return proc;
          })
          names.set(_process.username, _process.status);
        });
        sessions.set(_process.username, _process.session);
        processes.push(_process);
        return;
      }
    }

  }

  handleCreateProcess(data: CreateProcessData) {
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
      Date.now(),
    );
    // process added to pool, now start it
    // eslint-disable-next-line prefer-const
    startBotChecks(data.formData, _process);
    setTimeout(() => {
      // start it
      const command: string = os.platform() === "win32" ? "python" : "python3";
      const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${path.join(process.cwd(),
        'scripts', 'start_bot.py',)
        }`,
        { shell: true }
      );
      const _startBotData = { username: _process.username, config_name: _process.configFile };
      cmd.stdin.write(JSON.stringify(_startBotData));
      cmd.stdin.end();
      cmd.stderr.on("data", (chunk: string | Buffer) => {
        const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          }
          else return proc;
        });
        names.set(_process.username, _process.status);
      });
      cmd.stdout.on("data", (chunk: string | Buffer) => {
        const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
        if (_process.result.includes(output)) return;
        checkOutputCrashes(output, _process);
        checkBotFinished(output, _process);
        checkOutputWarnings(output, _process);
        checkOutputErrors(output, _process);
        checkOutputLogs(output, _process);
        checkOutputSleeping(output, _process);
        checkOutputCritical(output, _process);
        processes.map((proc: Process) => {
          if (proc.username === _process.username) {
            proc = _process;
          }
          else return proc;
        })
        names.set(_process.username, _process.status);
      });
      sessions.set(_process.username, _process.session);
      processes.push(_process);
      return;
    }, 200);
  }

  constructor() {
    this.connections = [];
    this.relations = new Map<string, string>();
  }

  // Add connection and event listeners
  add(connection: Socket) {
    this.connections.push(connection);
    // Start bot again
    connection.on<EventTypes>("start-process-again", (data: CreateProcessData) => {
      this.handleStartProcessAgain(data);
    });

    // Remove Schedule
    connection.on<EventTypes>("remove-schedule", (_username: string) => {
      if (schedules.has(_username)) {
        const proc: Process | undefined = processes.find((_p: Process) => _p.username === _username);
        if (proc) {
          clearTimeout(schedules.get(_username));
          proc.status = "STOPPED";
          proc.scheduled = false;
          names.set(_username, "STOPPED");
          schedules.delete(_username);
          processes.splice(processes.indexOf(proc), 1);
          processes.push(proc);
          connection.emit<EventTypes>("remove-schedule", `[INFO] Removed schedule for ${_username}`);
        }
        connection.emit<EventTypes>("remove-schedule", `[ERROR] Could not find bot for ${_username}`);
      }
      else {
        connection.emit<EventTypes>("remove-schedule", "[INFO] Bot is not scheduled !");
      }
    });
    connection.on<EventTypes>("create-processes", (data: BulkWriteData) => {
      // only keep usernames that are not running
      const botUsernames: string[] = [];
      // push to array of usernames if process.username does not have a status of running or waiting.
      data.formData.usernames[0].split(',').forEach((_username: string) => {
        if (names.has(_username)) {
          if (names.get(_username) === "RUNNING" || names.get(_username) === "WAITING") {
            connection.emit<EmitTypes>("create-processes-message", `[ERROR] ${_username} is already running...`);
            return;
          }
          else {
            botUsernames.push(_username)
          }
        }
        else {
          botUsernames.push(_username);
        }
      });
      // if array length is 0 that means all the provided usernames are running
      if (botUsernames.length === 0) {
        connection.emit<EmitTypes>("create-processes-message", `[ERROR] All the provided usernames are already running.`);
        return;
      }
      // assign it to the usernames
      data.formData.usernames = botUsernames;
      data.formData.usernames.forEach((_username: string, index: number) => {
        // check if process with this username exists
        const _process = new Process(
          data.formData.devices[index],
          _username,
          data.membership[index],
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
          data.formData.jobs,
          data.formData.config_name ? data.formData.config_name : "config.yml",
          Date.now(),
        );
        names.set(_process.username, _process.status);
        const { usernames, config_name, devices, jobs, ...rest } = data.formData;
        // process added to pool, now start it
        startBotChecks({ username: usernames[index], config_name: config_name ? config_name : "config.yml", device: devices[index], jobs: jobs, ...rest }, _process);
        setTimeout(() => {
          // start bot
          const command: string = os.platform() === "win32" ? "python" : "python3";
          const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${path.join(process.cwd(),
            'scripts', 'start_bot.py',)
            }`,
            { shell: true }
          );
          const _startBotData: { username: string, config_name: ConfigNames } = {
            username: _process.username,
            config_name: _process.configFile
          };
          cmd.stdin.write(JSON.stringify(_startBotData));
          cmd.stdin.end();
          cmd.stderr.on("data", (chunk: string | Buffer) => {
            const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
            checkOutputCrashes(output, _process);
            checkBotFinished(output, _process);
            checkOutputWarnings(output, _process);
            checkOutputErrors(output, _process);
            checkOutputLogs(output, _process);
            checkOutputSleeping(output, _process);
            checkOutputCritical(output, _process);
            processes.map((proc: Process) => {
              if (proc.username === _process.username) {
                proc = _process;
              }
              else return proc;
            })
            names.set(_process.username, _process.status);
          });
          cmd.stdout.on("data", (chunk: string | Buffer) => {
            const output = chunk.toString('utf-8').split("\n").map((line: string) => line).join("\n");
            if (_process.result.includes(output)) return;
            checkOutputCrashes(output, _process);
            checkBotFinished(output, _process);
            checkOutputWarnings(output, _process);
            checkOutputErrors(output, _process);
            checkOutputLogs(output, _process);
            checkOutputSleeping(output, _process);
            checkOutputCritical(output, _process);
            processes.map((proc: Process) => {
              if (proc.username === _process.username) {
                proc = _process;
              }
              else return proc;
            });
            names.set(_process.username, _process.status);
          });
          sessions.set(_process.username, _process.session);
          processes.push(_process);
          return;
        }, 300);
      })
    })
    // Get All Processes
    connection.on<EventTypes>("get-processes", (status?: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED") => {
      // message in this case is the username and device id
      if (status && status.trim() === "") {
        // get all processes with this status
        const ps = processes.filter((p) => p.status === status);
        connection.emit<EmitTypes>("get-processes-message", ps);
        return;
      }
      // 1. Get Session Data
      processes.map((_process: Process) => {
        const getPidsPath: string = path.join(process.cwd(), 'scripts', 'get_pids.py');
        const getPidsCommand: string = os.platform() === "win32" ? "python" : "python3";
        const getPidsCmd: ChildProcessWithoutNullStreams = spawn(`${getPidsCommand} ${getPidsPath}`, { shell: true });
        getPidsCmd.stdout.on('data', (data: string | Buffer) => {
          const result: string = data.toString('utf-8');
          if (result.includes("--config C:\\Users\\Ermisa\\Documents\\repos\\Sinteza\\server\\accounts")) {
            const results: string[] = result.split("\n");
            results.forEach((res: string) => {
              if (res.includes(`${path.join(process.cwd(), 'Bot', 'run.py')} --config ${path.join(process.cwd(), 'accounts', _process.username)}`)) {
                const fResult: string[] = res.split(" ").filter(el => el);
                const _pid = fResult[fResult.length - 1].replace("\r", "");
                _process.pid = _pid;
              }
            });
          }
        });
        const platformCommand: string = os.platform() === "win32" ? "findstr /i" : "egrep"
        const c = `adb -s ${_process.device.id} shell dumpsys battery | ${platformCommand} "level: "`;
        let _battery: string = "X";
        exec(c, (error: ExecException | null, stdout: string) => {
          if (error) {
            console.log({ error });
            return;
          }
          if (stdout.includes(`device '${_process.device.id}' not found`)) {
            _battery = "X";
          }
          else _battery = `${stdout.trim().split(":")[1]}%`.trim();
        });
        setTimeout(() => {
          _process.device.battery = _battery;
        }, 200);
        const data: ServerActionSessionData = { username: _process.username, followers_now: _process.followers, following_now: _process.following };
        const _path: string = path.join(process.cwd(), 'scripts', 'sessions.py');
        const command: string = os.platform() === "win32" ? "python" : "python3";
        const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${_path}`, { shell: true });
        cmd.stdin.write(JSON.stringify(data));
        cmd.stdin.end();
        cmd.stdout.on("data", (data: string | Buffer) => {
          // convert to string
          const fData = data.toString('utf-8');
          if (fData.includes("[ERROR] You have to run the bot at least once to generate a report!") ||
            fData.includes("[ERROR] If you want to use telegram_reports,")) {
            sessions.set(_process.username, ConfigRows);
            return;
          }
          else {
            const pData: ConfigRowsSkeleton = JSON.parse(fData) as ConfigRowsSkeleton;
            sessions.set(_process.username, pData);
            return;
          }
        });
        cmd.stderr.on("data", (data: string | Buffer) => {
          // convert to string
          const fData = data.toString('utf-8');
          if (fData.includes("[ERROR] You have to run the bot at least once to generate a report!") ||
            fData.includes("[ERROR] If you want to use telegram_reports")) {
            sessions.set(_process.username, ConfigRows);
            return;
          }
          else {
            const pData: ConfigRowsSkeleton = JSON.parse(fData) as ConfigRowsSkeleton;
            sessions.set(_process.username, pData);
            return;
          }
        });
        const session: ConfigRowsSkeleton | undefined = sessions.get(_process.username);
        _process.session = session ? session : ConfigRows;
        return _process;
      });
      setTimeout(() => {
        connection.emit<EmitTypes>("get-processes-message", processes);
        return;
      }, 350);
    });

    // Get One Process
    connection.on<EventTypes>("get-process", (props: { username: string, deviceId: string }) => {
      const p = processes.filter((p) => p.username === props.username && p.device.id === props.deviceId)[0];
      if (p) {
        connection.emit<EmitTypes>("get-process-message", p);
        return;
      }
      else connection.emit<EmitTypes>("get-process-message", "Success !");
    })

    // Create Process
    connection.on<EventTypes>("create-process", (data: CreateProcessData) => {
      if (names.has(data.formData.username)) {
        if (names.get(data.formData.username) === "RUNNING" || names.get(data.formData.username) === "WAITING") {
          connection.emit<EmitTypes>("create-process-message", "[ERROR] Process is already running...");
          return;
        }
      }
      if (data.scheduled) {
        const p: Process | undefined = processes.find((p) => p.username === data.formData.username);
        if (p) {
          // process exists
          processes.splice(processes.indexOf(p), 1);
        }
        this.handleProcessSchedule(data);
      }
      else {
        this.handleCreateProcess(data);
      }
    });

    // Update Process
    connection.on<EventTypes>("update-process", (_process: Process) => {
      this.updateProcesses(_process);
      connection.emit<EmitTypes>("update-process-message", processes);
    });

    // Update all processes
    connection.on<EventTypes>("update-processes", (_processes: Process[]) => {
      _processes.map((_process: Process) => {
        this.updateProcesses(_process);
      });
      connection.emit<EmitTypes>("update-processes-message", processes);
    })

    // remove process
    connection.on<EventTypes>("remove-process", (_username: string) => {
      if (names.has(_username)) {
        if (names.get(_username) === "RUNNING" || names.get(_username) === "WAITING") {
          connection.emit<EmitTypes>("create-process-message", "[ERROR] Process is already running...");
          return;
        }
      }
      const p: Process | undefined = processes.find((p) => p.username === _username);
      if (p) {
        // process exists
        processes.splice(processes.indexOf(p), 1);
        connection.emit<EmitTypes>("remove-process-message", "[INFO] Process removed.");
        return;
      }
      // process does not exist
      else {
        connection.emit<EmitTypes>("remove-process-message", "[ERROR] Could not find process.");
        return;
      }
    });

    // Stop process
    connection.on<EventTypes>("stop-process", (_username: string) => {
      const p = processes.find((process) => process.username === _username);
      if (p) {
        if(p.pid){
          try{
            execSync(`taskkill /F /PID ${p.pid}`);
          }
          catch (e){
            return;
          }
        }
        processes.map((_p: Process) => {
          if (p.username === _p.username) {
            _p.status = "STOPPED";
          }
        });
        names.set(_username, "STOPPED");
        this.relations.delete(_username);
        connection.emit<EmitTypes>("stop-process-message", "[INFO] Stopped process");
        return;
      }
      else {
        connection.emit<EmitTypes>("stop-process-message", "[ERROR] Process does not have a spawn shell...");
        return;
      }
    });

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
      let output: string = "";
      spawn('adb devices', { shell: true }).stdout.on('data', (_output: string | Buffer) => {
        output = _output.toString('utf-8').replace("List of devices attached", "").replace("device", "").replace("\t", "")
        return;
      })
      setTimeout(() => {
        const ids: string[] = output.trim()
          .split("\n")
          .map((d) => {
            const temp = d.replace("\r", "");
            const _t_stripped_temp = temp.replace("\t", "");
            return _t_stripped_temp.replace("device", "");
          });
        const platformCommand: string = os.platform() === "win32" ? "findstr /i" : "egrep"
        ids.map((id: string) => {
          Object.entries(DevicesList).forEach(([key, value]: [key: string, value: string]) => {
            if (devices.find((_d: Device) => _d.id === key)) return;
            if (key === id) {
              const command = `adb -s ${key} shell dumpsys battery | ${platformCommand} "level: "`;
              let _battery: string = "X";
              exec(command, (error: ExecException | null, stdout: string) => {
                if (error) {
                  console.log({ error });
                  return;
                }
                if (stdout.includes(`device '${key}' not found`)) {
                  _battery = "X";
                }
                else _battery = `${stdout.trim().split(":")[1]}%`.trim();
              });
              const a: Process | undefined = processes.find((_p: Process) => _p.device.id === key && _p.device.name === value);
              devices.push(new Device(key, value, _battery, a ? { username: a.username, configFile: a.configFile } : null));
            }
          });
        });
      }, 100);
      setTimeout(() => {
        connection.emit<EmitTypes>("get-devices-message", devices)
      }, 300);
      return;
    });
    // handle close event
    connection.on("close", () => {
      connection.disconnect();
      this.connections.splice(this.connections.indexOf(connection), 1);
    });
  }
}

