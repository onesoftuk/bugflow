import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    await registerRoutes(null, app);
    const { seedDatabase } = await import("../server/seed");
    await seedDatabase();
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
  } catch (err) {
    initialized = false;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
    app(req, res);
  } catch (err: any) {
    console.error("Serverless init error:", err);
    res.status(500).json({ message: "Server initialization failed", error: err.message });
  }
}
