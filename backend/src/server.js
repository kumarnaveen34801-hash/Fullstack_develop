import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI is required. Set it in backend/.env.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`Resume Parser API listening on port ${port}`);
  });
} catch (error) {
  console.error("Could not connect to MongoDB:", error.message);
  process.exit(1);
}
