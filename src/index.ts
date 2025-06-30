import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./routes/api";
import db from "./utils/database";
import docs from "./docs/route";
import { initScheduler } from "./utils/scheduler";
import { logger } from "./utils/logger";

async function init() {
  try {
    const result = await db();
    logger.info("Database status: ", result);

    const app = express();

    app.use(cors());
    app.use(bodyParser.json());

    const PORT = 3000;

    app.get("/", (req, res) => {
      res.status(200).json({
        message: "Server sedang berjalan",
        data: null,
      });
    });

    app.use("/api", router);
    docs(app);

    app.listen(PORT, () => {
      logger.info(`Server running on port http://localhost:${PORT}`);
      
      // Initialize scheduler after server has started
      initScheduler();
    });
  } catch (error) {
    logger.error("Error initializing server:", error);
  }
}

init();
