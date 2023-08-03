import { ChildProcessWithoutNullStreams } from "node:child_process";
import { Socket } from "socket.io";
import { ConfigRows, CreateProcessData, EmitTypes, EventTypes, SessionConfigSkeleton, SessionProfileSkeleton } from "../helpers/Types";
import { Process } from "../helpers/classes/Process";
import { startBot, startBotChecks } from "../helpers/Processes";

let processes: Process[] = [];


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
    // Get All Processes
    connection.on<EventTypes>("get-processes", (status?: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED") => {
      // message in this case is the username and device id
      if (status && status.trim() === "") {
        // get all processes with this status
        const ps = processes.filter((p) => p.status === status);
        connection.emit<EmitTypes>("get-processes-message", ps);
        return;
      }
      // get all processes
      connection.emit<EmitTypes>("get-processes-message", processes);
      return;
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
        Date.now(),
      );
      const p = processes.filter((process) => {
        if (process.username === _process.username) {
          if (process.status === "RUNNING" || process.status === "WAITING") {
            return process;
          } else {
            // remove process from pool if status is not running or not waiting
            removeProcess(_process);
            return undefined;
          }
        }
        return undefined;
      });
      // if process username in pool do nothing
      if (p.length > 0) {
        connection.emit<EmitTypes>("create-process-message", "[ERROR] Process is running !");
        return;
      }
      if (data.scheduled) {
        connection.emit<EmitTypes>("create-process-message", "[INFO] Scheduled bot start !");
        setTimeout(() => {
          // process added to pool, now start it
          startBotChecks(data.formData, connection);
          // start it
          const cmd: ChildProcessWithoutNullStreams | undefined = startBot(data.formData, connection)
          console.log({ cmd })
          if (cmd) {
            // add relation
            this.relations.set(_process.username, cmd);
            processes.push(_process);
            connection.emit<EmitTypes>("create-process-message", _process);
          }
          else return;
        }, data.startsAt);
      }
      else {
        // process added to pool, now start it
        startBotChecks(data.formData, connection);
        // start it
        const cmd: ChildProcessWithoutNullStreams | undefined = startBot(data.formData, connection)
        console.log({ cmd })
        if (cmd) {
          // add relation
          this.relations.set(_process.username, cmd);
          processes.push(_process);
          connection.emit<EmitTypes>("create-process-message", _process);
        }
        else return;
      }

    })
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
    connection.on<EventTypes>("stop-process", (_process: Process) => {
      const p = processes.find((process) => process.username === _process.username && process.device.id === _process.device.id);
      if (p) {
        if (p.cmd) {
          p.cmd.kill("SIGINT");
          connection.emit<EmitTypes>("stop-process-message", "[INFO] Stopped process");
          return;
        }
        else {
          connection.emit<EmitTypes>("stop-process-message", "[ERROR] Process does not have a spawn shell...");
          return;
        }
      }
      else {
        connection.emit<EmitTypes>("stop-process-message", "[ERROR] Process might have been killed ...");
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
