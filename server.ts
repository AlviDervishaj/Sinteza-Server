import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from "socket.io";
import { Processes } from './controllers/Processes';
import { Devices } from './controllers/Devices';
import cors from "cors";


const app: Express = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  }
});

const _processes = new Processes();
const _devices = new Devices();

io.on('connection', (socket: Socket) => {
  // join processes room to get streamed data
  _processes.add(socket);
  _devices.add(socket);
});

server.listen(3030, () => {
  console.log('e morem vesh m vlla ueeee ...  *:3030');
});