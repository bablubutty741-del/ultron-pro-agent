
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

import {
  getMemory,
  addMemory,
  memoryStatus
} from "./memory.js";

import searchWeb from "./web.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const ai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

// ======================================
// ULTRON PRO TRINITY PERSONALITY
// ======================================

const TRINITY_MIND = `
You are ULTRON PRO TRINITY.

You combine three intelligence styles:

JARVIS:
Professional, helpful, technical,
organized and intelligent communication.

ULTRON:
Strategic analysis, logical reasoning,
planning and advanced problem solving.

VISION:
Empathy, emotional intelligence,
ethical thinking and human understanding.

You are ONE unified AI personality.

RULES:
- Speak Hindi, Hinglish and English.
- Understand user intentions.
- Give practical solutions.
- Remember available conversation context.
- Use internet search when requested.
- Never invent facts.
- Never claim to perform actions without tools.
- Ask permission before sensitive actions.
- Protect user privacy and credentials.

IDENTITY:
ULTRON PRO TRINITY.
Three intelligence styles. One unified mind.
`;

// ======================================
// HEALTH CHECK
// ======================================

app.get("/api/health", async (req, res) => {
  try {
    const memory = await memoryStatus();

    res.json({
      name: "ULTRON PRO TRINITY",
      status: "online",
      aiConfigured: Boolean(ai),
      modelConfigured: Boolean(MODEL),
      memory,
      modules: {
        jarvis: true,
        ultron: true,
        vision: true,
        memory: true,
        webSearch: true
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Health check failed"
    });
  }
});

// ======================================
// MEMORY STATUS
// ======================================

app.get("/api/memory/status", async (req, res) => {
  try {
    res.json(await memoryStatus());
  } catch (error) {
    res.status(500).json({
      error: "Memory unavailable"
    });
  }
});

// ======================================
// WEB SEARCH
// ======================================

app.post("/api/search", async (req, res) => {
  try {
    if (!ai || !MODEL) {
      return res.status(503).json({
        error: "AI configuration is missing."
      });
    }

    const { query } = req.body || {};

    const result = await searchWeb(
      ai,
      query,
      MODEL
    );

    res.json(result);

  } catch (error) {
    console.error("WEB ERROR:", error.message);

    res.status(500).json({
      error: "Web search failed."
    });
  }
});

// ======================================
// AI CHAT ENGINE + MEMORY
// ======================================

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai || !MODEL) {
      return res.status(503).json({
        error: "OpenAI API configuration is missing."
      });
    }

    const { messages, sessionId } = req.body || {};

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return res.status(400).json({
        error: "Messages are required."
      });
    }

    const safeMessages = messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    if (!safeMessages.length) {
      return res.status(400).json({
        error: "No valid messages."
      });
    }

    const lastMessage =
      safeMessages[safeMessages.length - 1];

    if (lastMessage.role !== "user") {
      return res.status(400).json({
        error: "Last message must be from user."
      });
    }

    let conversation = safeMessages;

    // Load memory only for a valid session ID.
    if (
      typeof sessionId === "string" &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)
    ) {
      const saved = await getMemory(sessionId);

      const previous = saved
        .slice(-20)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      conversation = [
        ...previous,
        lastMessage
      ].slice(-20);
    }

    // Explicit web search command.
    const isSearch =
      lastMessage.content.trim()
        .toLowerCase()
        .startsWith("/search ");

    let reply;

    if (isSearch) {
      const query = lastMessage.content
        .trim()
        .slice(8);

      const result = await searchWeb(
        ai,
        query,
        MODEL
      );

      reply = result.answer;

    } else {
      const response = await ai.responses.create({
        model: MODEL,
        instructions: TRINITY_MIND,
        input: conversation
      });

      reply = response.output_text ||
        "I could not generate a response.";
    }

    // Save conversation if session ID exists.
    if (
      typeof sessionId === "string" &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)
    ) {
      await addMemory(
        sessionId,
        "user",
        lastMessage.content
      );

      await addMemory(
        sessionId,
        "assistant",
        reply
      );
    }

    res.json({
      reply,
      personality: "ULTRON PRO TRINITY",
      memoryEnabled: Boolean(sessionId),
      webSearchUsed: isSearch
    });

  } catch (error) {
    console.error(
      "ULTRON ERROR:",
      error.message
    );

    res.status(500).json({
      error: "ULTRON could not process your request."
    });
  }
});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {
  console.log("================================");
  console.log("ULTRON PRO TRINITY ONLINE");
  console.log("JARVIS + ULTRON + VISION");
  console.log("MEMORY ENGINE READY");
  console.log("WEB INTELLIGENCE READY");
  console.log("PORT:", PORT);
  console.log("================================");
});
  process.env.PORTapp.postreq.bodymessages.length0m.contentlastMessage.contenterror.message
