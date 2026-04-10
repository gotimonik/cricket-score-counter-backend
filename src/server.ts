require("dotenv").config();
import express from "express";
import type { Request, Response } from "express";
import * as http from "http";
import { SocketIOClientEvents, SocketIOEvents } from "./utils/constant";
import { Socket, Server as SocketIOServer } from "socket.io";

type GameScorePayload = Record<string, unknown> | string;
const gameScores = new Map<string, GameScorePayload>();

const formatOvers = (over: number, ball: number): string => {
  const safeOver = Number.isFinite(over) ? over : 0;
  const safeBall = Number.isFinite(ball) ? ball : 0;
  return `${safeOver}.${safeBall}`;
};

const formatRate = (rate: number): string => {
  if (!Number.isFinite(rate)) {
    return "0.0";
  }
  return rate.toFixed(1);
};

const buildStatusText = (payload: Record<string, unknown>): string | null => {
  const score = typeof payload.score === "number" ? payload.score : null;
  const targetScore =
    typeof payload.targetScore === "number" ? payload.targetScore : null;
  const remainingBalls =
    typeof payload.remainingBalls === "number" ? payload.remainingBalls : null;
  const targetOvers =
    typeof payload.targetOvers === "number" ? payload.targetOvers : null;
  const currentOver =
    typeof payload.currentOver === "number" ? payload.currentOver : null;
  const currentBallOfOver =
    typeof payload.currentBallOfOver === "number"
      ? payload.currentBallOfOver
      : null;

  if (score === null) {
    return null;
  }

  const ballsFaced =
    currentOver !== null && currentBallOfOver !== null
      ? currentOver * 6 + currentBallOfOver
      : null;

  if (targetScore && targetScore > 0) {
    if (remainingBalls === null) {
      const needs = targetScore - score;
      return needs > 0 ? `Needs ${needs}` : "Won";
    }

    const needs = targetScore - score;
    if (needs <= 0) {
      return "Won";
    }
    if (remainingBalls <= 0) {
      return "Final Over";
    }
    if (remainingBalls <= 6) {
      return "Last 6 balls";
    }
    if (remainingBalls <= 12) {
      return `Needs ${needs} in ${remainingBalls}`;
    }

    const rrr = (needs * 6) / remainingBalls;
    return `RRR ${formatRate(rrr)}`;
  }

  if (ballsFaced && ballsFaced > 0) {
    const crr = (score * 6) / ballsFaced;
    return `CRR ${formatRate(crr)}`;
  }

  if (targetOvers && targetOvers > 0 && remainingBalls === 0) {
    return "Final Over";
  }

  return null;
};

const buildLiveUpdateFromScore = (
  payload: Record<string, unknown>
): string | null => {
  const teamName =
    Array.isArray(payload.teams) && typeof payload.teams[0] === "string"
      ? payload.teams[0]
      : null;
  const score = typeof payload.score === "number" ? payload.score : null;
  const wickets = typeof payload.wickets === "number" ? payload.wickets : null;
  const currentOver =
    typeof payload.currentOver === "number" ? payload.currentOver : null;
  const currentBallOfOver =
    typeof payload.currentBallOfOver === "number"
      ? payload.currentBallOfOver
      : null;
  const statusText = buildStatusText(payload);

  if (
    teamName === null ||
    score === null ||
    wickets === null ||
    currentOver === null ||
    currentBallOfOver === null
  ) {
    return null;
  }

  const oversText = formatOvers(currentOver, currentBallOfOver);
  const scoreText = `${teamName} ${score}/${wickets} (${oversText})`;

  if (statusText) {
    return `${scoreText}  •  ${statusText}`;
  }

  return scoreText;
};

const toLiveUpdateText = (payload: GameScorePayload): string | null => {
  if (typeof payload === "string") {
    return payload.trim().length > 0 ? payload : null;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidateKeys = [
    "liveUpdateText",
    "homePageText",
    "summary",
    "scoreSummary",
    "statusText",
    "displayText",
    "scoreText",
    "text",
  ] as const;

  for (const key of candidateKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return buildLiveUpdateFromScore(payload);
};

const getLiveUpdatesPayload = (): string[] => {
  const liveUpdates: string[] = [];
  for (const score of gameScores.values()) {
    const text = toLiveUpdateText(score);
    if (text) {
      liveUpdates.push(text);
    }
  }
  return liveUpdates;
};
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
    (data: { gameId: string } & Record<string, unknown>) => {
      const { gameId } = data || {};
      if (gameId) {
        gameScores.set(gameId, data);
        io.to(gameId).emit(
          SocketIOEvents.GAME_SCORE_UPDATED,
          JSON.stringify(data)
        );
      }
    }
  );

  // On live updates request (home screen)
  socket.on(SocketIOClientEvents.LIVE_UPDATES, () => {
    const liveUpdates = getLiveUpdatesPayload();
    socket.emit(SocketIOEvents.LIVE_UPDATES, JSON.stringify(liveUpdates));
  });

  // On home page view, send all running matches
  socket.on(SocketIOClientEvents.HOME_PAGE_VIEW, () => {
    const liveUpdates = getLiveUpdatesPayload();
    socket.emit(SocketIOEvents.LIVE_UPDATES, JSON.stringify(liveUpdates));
  });

  socket.on("disconnect", (reason) => {
    console.log(`disconnected socket client ${socket.id}`, reason);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
