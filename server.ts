import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from "socket.io";
import { Processes } from './controllers/Processes';
import cors from "cors";


const app: Express = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
  }
});

const _processes = new Processes();

io.on('connection', (socket: Socket) => {
  _processes.add(socket);
});

server.listen(3030, () => {
  console.log('Running on http://localhost:3030');
});
