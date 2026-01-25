import express from "express";
import { config } from "dotenv";
config({ path: "./.env" });
import dbConnection  from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import analyzerRouter from "./routes/analyzerRoutes.js";
import experienceRouter from "./routes/experienceRoutes.js";
import mockInterviewRouter from "./routes/mockInterviewRoutes.js";
import resumeRouter from "./routes/resumeRoutes.js";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import expressStatic from "express";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

// Allow common dev/prod frontends if env is missing
const fallbackOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://careerconnectjobportal.vercel.app",
];

const originWhitelist = Array.from(new Set([...allowedOrigins, ...fallbackOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || originWhitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/analyzer", analyzerRouter);
app.use("/api/v1/experience", experienceRouter);
app.use("/api/v1/mock", mockInterviewRouter);
app.use("/api/v1/resume", resumeRouter);
dbConnection();

app.use(errorMiddleware);
export default app;
