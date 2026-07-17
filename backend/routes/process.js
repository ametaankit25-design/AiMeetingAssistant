const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { cleanTranscript, generateMinutes } = require("../services/ollama");

const router = express.Router();

// ── Allowed audio MIME types & extensions ───────────────────
const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/aac",
]);
const ALLOWED_EXT = new Set([
  ".wav",
  ".mp3",
  ".m4a",
  ".ogg",
  ".webm",
  ".flac",
  ".aac",
  ".mp4",
]);
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Configure multer to save uploads to backend/uploads/
const uploadDir = path.join(__dirname, "..", "uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Prefix with timestamp to avoid collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype} (${ext}). Supported: WAV, MP3, M4A, OGG, WEBM, FLAC, AAC`
        )
      );
    }
  },
});

/**
 * Runs the whisper_runner.py script on the given audio file.
 * Returns a promise that resolves with the transcript text.
 */
function runWhisper(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "whisper_runner.py");
    const timeout = 300_000; // 5 minutes for large files

    // Verify the script exists
    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Whisper script not found at: ${scriptPath}`)
      );
    }

    // Use local virtual environment's python interpreter if available
    let pythonPath = "python";
    const venvPythonPath = path.join(
      __dirname,
      "..",
      "..",
      "venv",
      "Scripts",
      "python.exe"
    );
    if (fs.existsSync(venvPythonPath)) {
      pythonPath = venvPythonPath;
    }

    console.log(`Using Python: ${pythonPath}`);
    console.log(`Whisper script: ${scriptPath}`);
    console.log(`Audio file: ${filePath}`);

    execFile(
      pythonPath,
      [scriptPath, filePath],
      { timeout, maxBuffer: 10 * 1024 * 1024 }, // 10 MB stdout buffer
      (error, stdout, stderr) => {
        if (error) {
          console.error("Whisper stderr:", stderr);

          // Distinguish timeout from other errors
          if (error.killed) {
            return reject(
              new Error(
                `Whisper transcription timed out after ${timeout / 1000} seconds. Try a shorter audio file.`
              )
            );
          }

          // Python import errors
          if (
            stderr &&
            (stderr.includes("ModuleNotFoundError") ||
              stderr.includes("ImportError"))
          ) {
            return reject(
              new Error(
                "Missing Python dependencies for Whisper. Run: pip install transformers librosa numpy torch"
              )
            );
          }

          return reject(
            new Error(
              `Whisper transcription failed: ${error.message}${stderr ? "\n" + stderr.slice(0, 500) : ""}`
            )
          );
        }

        const transcript = stdout.trim();
        if (!transcript) {
          return reject(
            new Error(
              "Whisper returned an empty transcript. The audio file may be silent or corrupted."
            )
          );
        }

        resolve(transcript);
      }
    );
  });
}

/**
 * POST /
 * Accepts a single audio file (field name: "audio"), transcribes it,
 * cleans the transcript, and generates meeting minutes.
 */
router.post("/", upload.single("audio"), async (req, res) => {
  let filePath = null;

  try {
    // Validate that a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }
    filePath = req.file.path;
    console.log(
      `Processing uploaded file: ${filePath} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`
    );

    // Step 1: Transcribe audio with Whisper
    console.log("Step 1: Running Whisper transcription...");
    const rawTranscript = await runWhisper(filePath);
    console.log(
      `Whisper transcription complete (${rawTranscript.length} chars).`
    );

    // Step 2: Clean the transcript via Ollama
    console.log("Step 2: Cleaning transcript via Ollama...");
    const cleanedTranscript = await cleanTranscript(rawTranscript);
    console.log("Transcript cleaning complete.");

    // Step 3: Generate meeting minutes via Ollama
    console.log("Step 3: Generating meeting minutes via Ollama...");
    const meetingMinutes = await generateMinutes(cleanedTranscript);
    console.log("Meeting minutes generation complete.");

    // Return all three results
    return res.json({
      rawTranscript,
      cleanedTranscript,
      meetingMinutes,
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  } finally {
    // Clean up the uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up uploaded file: ${filePath}`);
      } catch (cleanupErr) {
        console.error("Failed to clean up file:", cleanupErr);
      }
    }
  }
});

// ── Multer error handler ────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
      });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
