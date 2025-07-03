import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./routes/api";
import db from "./utils/database";
import docs from "./docs/route";
import { initScheduler } from "./utils/scheduler";
import { logger } from "./utils/logger";
import environment from "./config/environment";

async function init() {
  try {
    const result = await db();
    logger.info("Database status: ", result);

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
      
      initScheduler();
    });
  } catch (error) {
    logger.error("Error initializing server:", error);
  }
}

init();
