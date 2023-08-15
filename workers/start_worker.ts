/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { parentPort, workerData } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { Process } from "../helpers/classes/Process";
import {
  ConfigRows,
  CreateProcessData,
  SessionConfigSkeleton,
  SessionProfileSkeleton,
} from "../helpers/Types";
import { startBotChecks } from "../helpers/Processes";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
const processes: Process[] = [];

function startProcess(data: CreateProcessData[]) {
  for (const createProcessData of data) {
    const _process = new Process(
      createProcessData.formData.device,
      createProcessData.formData.username,
      createProcessData.membership,
      "RUNNING",
      "",
      0,
      0,
      0,
      ConfigRows,
      SessionConfigSkeleton,
      SessionProfileSkeleton,
      0,
      createProcessData.scheduled,
      createProcessData.jobs,
      "config.yml",
      Date.now()
    );
    processes.push(_process);
    // process added to pool, now start it
    // eslint-disable-next-line prefer-const
    startBotChecks(createProcessData.formData, _process);
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
    return;
  }
}
const data: {
  data: CreateProcessData[];
} = {
  data: JSON.parse(workerData.data) as CreateProcessData[],
};
startProcess(data.data);
parentPort?.postMessage({ processes });
