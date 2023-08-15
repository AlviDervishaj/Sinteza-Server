/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import path from "node:path";
import { readFileSync } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
// import dayjs from "dayjs";

const output: Map<string, string> = new Map<string, string>();

function readLogs(usernames: string[]) {
  // read from logs
  for (const username of usernames) {
    // const month: string = dayjs().format("MM");
    // const date: string = dayjs().format("DD");
    // const prevDate: string = dayjs().subtract(1, "day").format("DD");
    // const todayFormat: string = `[${month}/${date}`;
    // const previousDayFormat: string = `[${month}/${prevDate}`;

    const _logPath: string = path.join(
      process.cwd(),
      "accounts",
      username,
      `${username}.log`
    );
    // read username.log file
    try {
      const data: string = readFileSync(_logPath, "utf8");
      output.set(username, data);
      // writeFileSync(_logPath, rewrite.length > 0 ? rewrite.join("\n") : "");
    } catch (err) {
      console.log(err);
    }
  }
}

readLogs(workerData.usernames);
setTimeout(() => {
  parentPort?.postMessage(output);
}, 300);
