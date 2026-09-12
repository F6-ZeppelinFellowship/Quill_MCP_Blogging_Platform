import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  apiKey: process.env.API_KEY || "test_key_123",
  dbPath: process.env.DATABASE_PATH || "./data/quill.db",
};