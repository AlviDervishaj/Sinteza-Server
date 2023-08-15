/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import path from "node:path";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { parentPort, workerData } from "node:worker_threads";
import {
  ConfigRowsSkeleton,
  ServerActionSessionData,
  WorkerSessions,
} from "../helpers/Types";

const sessions: Array<WorkerSessions> = [];

function getSession(data: ServerActionSessionData[]) {
  const _path: string = path.join(process.cwd(), "scripts", "sessions.py");
  const command: string = "python";

  data.forEach((user: ServerActionSessionData) => {
    const cmd: ChildProcessWithoutNullStreams = spawn(`${command} ${_path}`, {
      shell: true,
    });
    cmd.stdin.write(JSON.stringify(user));
    cmd.stdin.end();
    cmd.stdout.on("data", (data: string | Buffer) => {
      // convert to string
      const fData = data.toString("utf-8");
      if (
        fData.includes(
          "[ERROR] You have to run the bot at least once to generate a report!"
        ) ||
        fData.includes("[ERROR] If you want to use telegram_reports,")
      ) {
        return;
      } else {
        const pData: ConfigRowsSkeleton = JSON.parse(
          fData
        ) as ConfigRowsSkeleton;
        sessions.push({ username: user.username, session: pData });
        return;
      }
    });
  });
}

getSession(workerData.data);
setTimeout(() => {
  parentPort?.postMessage(sessions);
}, 1000);
