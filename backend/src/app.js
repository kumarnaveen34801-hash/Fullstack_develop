import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import Analysis from "./models/Analysis.js";
import { analyzeResumeText } from "./analysis.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_JOB_DESCRIPTION_LENGTH = 20000;
const PDF_SIGNATURE = Buffer.from("%PDF-");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 1,
    fieldSize: MAX_JOB_DESCRIPTION_LENGTH,
  },
  fileFilter(_req, file, callback) {
    if (
      file.mimetype !== "application/pdf" &&
      !/\.pdf$/i.test(file.originalname)
    ) {
      callback(new ApiError(400, "Only PDF files are supported."));
      return;
    }
    callback(null, true);
  },
});

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: Analysis.db.readyState === 1 ? "connected" : "disconnected",
  });
});

app.post("/api/analyses", upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "Upload a PDF resume to analyze.");
    }

    const jobDescription = req.body.jobDescription;
    if (typeof jobDescription !== "string") {
      throw new ApiError(400, "A job description is required.");
    }
    if (!jobDescription.trim()) {
      throw new ApiError(400, "A job description is required.");
    }
    if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      throw new ApiError(413, "The job description is too long.");
    }

    const cleanedJobDescription = jobDescription.trim();
    const signatureOffset = req.file.buffer
      .subarray(0, 1024)
      .indexOf(PDF_SIGNATURE);
    if (signatureOffset === -1) {
      throw new ApiError(
        400,
        "This file could not be read as a PDF. Check that it is a valid, unprotected PDF.",
      );
    }

    let resumeText;
    try {
      resumeText = await extractPdfText(req.file.buffer);
    } catch (error) {
      if (error.name === "PasswordException") {
        throw new ApiError(
          422,
          "This PDF is password-protected. Upload an unprotected copy.",
        );
      }
      throw new ApiError(
        422,
        "This PDF could not be parsed. Check that it is valid and not password-protected.",
      );
    }

    if (!resumeText.trim()) {
      throw new ApiError(
        422,
        "No text could be extracted. Scanned/image-only PDFs are not supported.",
      );
    }

    const analysis = analyzeResumeText(resumeText, cleanedJobDescription);
    const savedAnalysis = await Analysis.create({
      resumeName: req.file.originalname,
      jobDescription: cleanedJobDescription,
      ...analysis,
    });

    res.status(201).json({
      analysis: {
        ...analysis,
        id: savedAnalysis.id,
        createdAt: savedAnalysis.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "The PDF exceeds the 10 MB upload limit."
        : "The upload contains too many files or fields.";
    res.status(status).json({ error: message });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error("Request failed:", error);
  res.status(500).json({ error: "The server could not complete the request." });
});

export default app;
