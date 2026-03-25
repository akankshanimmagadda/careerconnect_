import dotenv from "dotenv";
dotenv.config();

console.log("ENV CHECK:", {
  bucket: process.env.AWS_S3_BUCKET_NAME,
  region: process.env.AWS_REGION,
  key: process.env.AWS_ACCESS_KEY_ID ? "present" : "missing",
});

import app from "./app.js";
import http from "http";
import { setupSocket } from "./socket.js";

const server = http.createServer(app);
setupSocket(server);

server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running at port ${process.env.PORT}`);
});
