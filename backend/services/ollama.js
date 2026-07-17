const axios = require("axios");

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "llama3.2";
const TEMPERATURE = 0.3;
const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per request
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Helper to call the Ollama generate API with retry logic and error handling.
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} The generated response text
 */
async function callOllama(prompt) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        OLLAMA_URL,
        {
          model: MODEL,
          prompt: prompt,
          stream: false,
          options: {
            temperature: TEMPERATURE,
          },
        },
        {
          timeout: OLLAMA_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
        }
      );

      // Validate response structure
      if (!response.data || typeof response.data.response !== "string") {
        throw new Error(
          "Unexpected Ollama response format: " +
            JSON.stringify(response.data).slice(0, 200)
        );
      }

      return response.data.response;
    } catch (err) {
      lastError = err;

      // Connection refused — Ollama is not running
      if (err.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Ollama at " +
            OLLAMA_URL +
            ". Please ensure Ollama is running (run: ollama serve)."
        );
      }

      // Timeout
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error(
          "Ollama request timed out after " +
            OLLAMA_TIMEOUT_MS / 1000 +
            " seconds. The transcript may be too long."
        );
      }

      // Ollama returned an HTTP error
      if (err.response) {
        const status = err.response.status;
        const body =
          typeof err.response.data === "string"
            ? err.response.data
            : JSON.stringify(err.response.data);

        // Model not found
        if (status === 404) {
          throw new Error(
            `Ollama model "${MODEL}" not found. Run: ollama pull ${MODEL}`
          );
        }

        // Server errors — retry
        if (status >= 500 && attempt < MAX_RETRIES) {
          console.warn(
            `Ollama returned ${status}, retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_RETRIES})...`
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }

        throw new Error(`Ollama error (HTTP ${status}): ${body.slice(0, 300)}`);
      }

      // Network errors — retry once
      if (attempt < MAX_RETRIES) {
        console.warn(
          `Ollama network error: ${err.message}, retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_RETRIES})...`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      throw new Error("Ollama request failed: " + err.message);
    }
  }

  throw lastError;
}

/**
 * Calls Ollama to clean up a raw transcript by removing filler words,
 * fixing punctuation, and correcting stutters — without summarizing.
 * @param {string} rawTranscript - The raw STT output
 * @returns {Promise<string>} The cleaned transcript text
 */
async function cleanTranscript(rawTranscript) {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    throw new Error("Cannot clean an empty transcript.");
  }

  const prompt = `You are a transcript cleaning assistant. 
You will be given a raw, unedited transcript from a speech-to-text system.

Your task:
- Remove filler words (um, uh, like, you know)
- Fix punctuation and capitalization
- Remove repeated words or stutters
- Keep the original meaning and speaker intent intact
- Do NOT summarize or shorten the content — only clean it up

Raw Transcript:
${rawTranscript}

Cleaned Transcript:`;

  return callOllama(prompt);
}

/**
 * Calls Ollama to generate meeting minutes (summary + action items)
 * from a cleaned transcript.
 * @param {string} cleanedTranscript - The cleaned-up transcript
 * @returns {Promise<string>} The formatted meeting minutes
 */
async function generateMinutes(cleanedTranscript) {
  if (!cleanedTranscript || cleanedTranscript.trim().length === 0) {
    throw new Error("Cannot generate minutes from an empty transcript.");
  }

  const prompt = `You are a meeting assistant. 
Based on the cleaned meeting transcript below, generate:

1. A concise summary of the meeting (3-5 bullet points)
2. A list of action items / tasks mentioned, with the responsible person if stated

Format your response exactly like this:

## Meeting Summary
- point 1
- point 2

## Action Items
- [Owner] Task description

Cleaned Transcript:
${cleanedTranscript}`;

  return callOllama(prompt);
}

module.exports = { cleanTranscript, generateMinutes };
