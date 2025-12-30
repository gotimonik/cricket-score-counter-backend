"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const constant_1 = require("./utils/constant");
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
app.get("/", (req, res) => {
    res.send("Socket.IO server is running!");
});
io.on("connection", (socket) => {
    console.log("socket.id", socket.id);
    socket.on(constant_1.SocketIOClientEvents.ROOM_JOIN, (roomID) => {
        console.log("roomID", roomID);
        socket.join(roomID);
    });
    socket.on(constant_1.SocketIOClientEvents.GAME_SCORE_UPDATE, (data) => {
        const gameId = data === null || data === void 0 ? void 0 : data.gameId;
        if (gameId) {
            io.to(gameId).emit(constant_1.SocketIOEvents.GAME_SCORE_UPDATED, JSON.stringify(data));
        }
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
//# sourceMappingURL=server.js.map