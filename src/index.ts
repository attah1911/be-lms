import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./routes/api";
import { prisma } from "./utils/prisma";
import docs from "./docs/route";
import { logger } from "./utils/logger";
import environment from "./config/environment";

async function init() {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    const app = express();

    app.use(cors({
      origin: [
        environment.FRONTEND_URL || 'http://localhost:3001',
        'https://front-end-e-learning.vercel.app',
        'http://localhost:3001',
        'http://hatta.isdwk.my.id:3001'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    app.options('*', cors());

    app.use(bodyParser.json());

    const PORT = environment.PORT || 3000;

    app.get("/", (req, res) => {
      res.status(200).json({
        message: "Server sedang berjalan",
        data: null,
      });
    });

    app.use("/api", router);
    docs(app);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Error initializing server:", error);
  }
}

init();
