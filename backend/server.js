import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import http from "http";
import { setupSocket } from "./socket.js";

const server = http.createServer(app);
setupSocket(server);

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running at port ${process.env.PORT}`);
});
