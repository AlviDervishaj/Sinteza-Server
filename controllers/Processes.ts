import { ChildProcessWithoutNullStreams, ExecException, exec, spawn } from "node:child_process";
import { Socket } from "socket.io";
import { ConfigNames, ConfigRows, ConfigRowsSkeleton, CreateProcessData, DeviceSkeleton, EmitTypes, EventTypes, Jobs, ServerActionSessionData, SessionConfigSkeleton, SessionProfileSkeleton } from "../helpers/Types";
import os from "node:os";
import { Process } from "../helpers/classes/Process";
import { startBotChecks } from "../helpers/Processes";
import path from "node:path";
import { checkBotFinished, checkOutputCrashes, checkOutputCritical, checkOutputErrors, checkOutputLogs, checkOutputSleeping, checkOutputWarnings } from "../helpers/ServerActions";

export let processes: Process[] = [];
export const names = new Map<string, "RUNNING" | "WAITING" | "STOPPED" | "FINISHED">();

const sessions = new Map<string, ConfigRowsSkeleton>();

const formatPid = (data: string): string => {
  const _split_data: string[] = data.split("\n");
  // filter out empty elements
  const _not_empty: string[] = _split_data.filter(element => element);
  // select the first one in the list
  const _process: string = _not_empty[0];
  const _formatted_process = _process.split(' ').filter(element => element).join(" ");
  const pid: string = _formatted_process.split(" ")[1];
  return pid;
}


// update process
const updateProcesses = (_process: Process) => {
  processes = processes.filter((p: Process) => {
    if (
      p.username === _process.username &&
      p.device === _process.device
    ) {
      return _process;
    } else return p;
  })
}

const getProcessPid = (_process: Process): void => {
  const _path: string = path.join(process.cwd(), 'Bot', 'run.py');
  const spawnedArgs: string = `--config ${path.join(process.cwd(),
    'accounts', _process.username, 'config.yml')}`
  const command = os.platform() === "linux" ? 'ps -aux | egrep' : 'tasklist | findstr /i';
  const pythonCommand = os.platform() === "linux" ? 'python3' : 'python.exe';
  exec(`${command} "${pythonCommand} ${_path} ${spawnedArgs}" `, (_: ExecException | null, output: string) => {
    const result = formatPid(output.toString());
    _process.pid = result;
  });
}

// remove process
const removeProcess = (_process: Process) => {
  if (_process.status !== "RUNNING" && _process.status !== "WAITING") {
    const p = processes.filter((p) => {
      if (
        p.username === _process.username &&
        p.device === _process.device
      ) {
        return;
      } else return p;
    })
    processes.splice(0, processes.length);
    processes = [...p];
  }
}

type BulkFormData = {
  usernames: string[],
  devices: DeviceSkeleton[],
  jobs: Jobs,
  config_name?: ConfigNames;
  "speed-multiplier"?: number;
  "truncate-sources"?: string,
  "blogger-followers"?: string[],
  "hashtag-likers-top"?: string[],
  "unfollow-non-followers"?: string,
  "unfollow-skip-limit"?: string,
  "working-hours"?: string[],
}
type BulkWriteData = {
  formData: BulkFormData,
  membership: "FREE" | "PREMIUM",
  jobs: Jobs,
  scheduled: string | false,
  startTime: number,
  status: "RUNNING" | "WAITING" | "FINISHED" | "STOPPED"
}

// Processes
export class Processes {
  // list of connections
  private connections: Socket[];
  private relations: Map<string, ChildProcessWithoutNullStreams>;

  constructor() {
    this.connections = [];
    this.relations = new Map<string, ChildProcessWithoutNullStreams>();
  }

  // Add connection and event listeners
  add(connection: Socket) {
    this.connections.push(connection);
    connection.on<EventTypes>("create-processes", (data: BulkWriteData) => {
      // only keep usernames that are not running
      const botUsernames: string[] = [];
      // push to array of usernames if process.username does not have a status of running or waiting.
      data.formData.usernames[0].split(',').forEach((_username: string) => {
        if (names.has(_username)) {
          if (names.get(_username) === "RUNNING") {
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
        names.set(_process.username, _process.status);
        const { usernames, config_name, devices, jobs, ...rest } = data.formData;
        // process added to pool, now start it
        startBotChecks({ username: usernames[index], config_name, device: devices[index], jobs: jobs, ...rest }, _process);
        setTimeout(() => {
          // start bot
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
            names.set(_process.username, _process.status);
          });
          this.relations.set(_process.username, cmd);
          sessions.set(_process.username, _process.session);
          processes.push(_process);
          return;
        }, 200);
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
        // get pid
        getProcessPid(_process);
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
        if (names.get(data.formData.username) === "RUNNING") {
          connection.emit<EmitTypes>("create-process-message", "[ERROR] Process is already running...");
          return;
        }
      }
      processes.map((process) => {
        if (process.username === data.formData.username) {
          if (process.status === "RUNNING" || process.status === "WAITING") {
            connection.emit<EmitTypes>("create-process-message", "[ERROR] Process is already running...");
            return process;
          } else {
            // remove process from pool if status is not running or not waiting
            removeProcess(process);
            return undefined;
          }
        }
        return undefined;
      });
      if (data.scheduled) {
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
        setTimeout(() => {
          // process added to pool, now start it
          startBotChecks(data.formData, _process);
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
            names.set(_process.username, _process.status);
          });
          sessions.set(_process.username, _process.session);
          this.relations.set(_process.username, cmd);
          processes.map((_p: Process) => _p.username === _process.username ? _process : _p);
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
          this.relations.set(_process.username, cmd);
          processes.map((_p: Process) => _p.username === _process.username ? _process : _p);
        }, data.startsAt);
      }
      else {
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
        let output: string = "";
        startBotChecks(data.formData, _process);
        setTimeout(() => {
          connection.emit<EmitTypes>("start-bot-message", output);
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
            names.set(_process.username, _process.status);
          });
          this.relations.set(_process.username, cmd);
          sessions.set(_process.username, _process.session);
          processes.push(_process);
          return;
        }, 200);
      }
    });

    // Update Process
    connection.on<EventTypes>("update-process", (_process: Process) => {
      updateProcesses(_process);
      connection.emit<EmitTypes>("update-process-message", processes);
    });

    // Update all processes
    connection.on<EventTypes>("update-processes", (_processes: Process[]) => {
      _processes.map((_process: Process) => {
        updateProcesses(_process);
      });
      connection.emit<EmitTypes>("update-processes-message", processes);
    })

    // remove process
    connection.on<EventTypes>("remove-process", (_process: Process) => {
      const p = processes.find((p) => p.username === _process.username && p.device.id === _process.device.id);
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
        const platformCommand: string = os.platform() === "win32" ? "taskkill /F /PID" : "kill -9"
        const pid = p.pid;
        exec(`${platformCommand} ${pid}`)
        // remove from pool
        processes.splice(processes.indexOf(p), 1);
        connection.emit<EmitTypes>("stop-process-message", "[INFO] Stopped process");
        return;
      }
      else {
        connection.emit<EmitTypes>("stop-process-message", "[ERROR] Process does not have a spawn shell...");
        return;
      }
    });
    // handle close event
    connection.on("close", () => {
      connection.disconnect();
      this.connections.splice(this.connections.indexOf(connection), 1);
    });
  }
}

