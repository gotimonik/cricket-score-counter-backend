require("dotenv").config();
import express from "express";
import type { Request, Response } from "express";
import * as http from "http";
import { SocketIOClientEvents, SocketIOEvents } from "./utils/constant";
import { Socket, Server as SocketIOServer } from "socket.io";

var temp: { [key: string]: object } = {};
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req: Request, res: Response) => {
  res.send("Socket.IO server is running!");
});

io.on("connection", (socket: Socket) => {
  console.log("socket.id", socket.id);
  socket.on(SocketIOClientEvents.ROOM_JOIN, (roomID: string) => {
    socket.join(roomID);
    if (temp[roomID]) {
      socket.emit(
        SocketIOEvents.GAME_SCORE_UPDATED,
        JSON.stringify(temp[roomID])
      );
    }
  });

  socket.on(
    SocketIOClientEvents.GAME_SCORE_UPDATE,
    (data: { gameId: string }) => {
      const { gameId } = data;
      if (gameId) {
        temp[gameId] = data;
        io.to(gameId).emit(
          SocketIOEvents.GAME_SCORE_UPDATED,
          JSON.stringify(data)
        );
      }
    }
  );

  socket.on("disconnect", (reason) => {
    console.log(`disconnected socket client ${socket.id}`, reason);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
