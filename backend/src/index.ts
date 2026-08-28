import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { generateOpenApiDocument } from "./docs/openapi.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(router);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));
app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(env.port, () => {
    console.log(`FreeRoom API running at http://localhost:${env.port}`);
    console.log(`Swagger UI at http://localhost:${env.port}/docs`);
  });
}
