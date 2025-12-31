require("dotenv").config();
import express from "express";
import type { Request, Response } from "express";
import * as http from "http";
import { SocketIOClientEvents, SocketIOEvents } from "./utils/constant";
import { Socket, Server as SocketIOServer } from "socket.io";

const gameScores = new Map<string, object>();
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
  // On game join
  socket.on(SocketIOClientEvents.GAME_JOIN, (roomID: string) => {
    socket.join(roomID);
    if (gameScores.has(roomID)) {
      socket.emit(
        SocketIOEvents.GAME_SCORE_UPDATED,
        JSON.stringify(gameScores.get(roomID))
      );
    }
  });

  // On game end
  socket.on(SocketIOClientEvents.GAME_END, (roomID: string) => {
    socket.leave(roomID);
    if (gameScores.has(roomID)) {
      gameScores.delete(roomID);
    }
  });

  // On game score update
  socket.on(
    SocketIOClientEvents.GAME_SCORE_UPDATE,
    (data: { gameId: string }) => {
      const { gameId } = data;
      if (gameId) {
        gameScores.set(gameId, data);
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
