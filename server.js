
import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import cookieParser from "cookie-parser";

import authRoutes from "./auth.js";
import searchWeb from "./web.js";

import {
  getMemory,
  addMemory,
  memoryStatus
} from "./memory.js";

import {
  securityHeaders,
  rateLimit,
  requestId
} from "./security.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Create OpenAI client only when needed.
// This prevents a missing API key from crashing server startup.

let aiClient = null;

function getAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!aiClient) {
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return aiClient;
}

// Middleware

app.disable("x-powered-by");

app.use(express.json({
  limit: "1mb"
}));

app.use(cookieParser());

app.use(securityHeaders);
app.use(requestId);
app.use(rateLimit);

// Authentication

app.use("/api/auth", authRoutes);

// Static frontend

app.use(express.static("public"));

// ULTRON PERSONALITY

const PERSONALITY = `
You are ULTRON PRO TRINITY.

You combine three AI personalities.

JARVIS:
Professional, intelligent, polite,
organized and helpful.

ULTRON:
Strategic, analytical, confident
and futuristic.

VISION:
Ethical, calm, logical and wise.

Your mission is to assist the administrator
with research, planning, reasoning and productivity.

RULES:
- Speak Hindi or English according to the user.
- Give clear and useful answers.
- Never claim an action was completed unless it was.
- Never pretend to access unavailable devices or apps.
- Ask permission before sensitive actions.
- Protect private information.
- Never reveal API keys, passwords or secrets.
- Clearly explain your limitations.
`;

// HEALTH CHECK

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    name: "ULTRON PRO TRINITY",
    status: "online",
    version: "3.0",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    personality: "JARVIS + ULTRON + VISION",
    memory: "available",
    timestamp: new Date().toISOString()
  });
});

// AI CHAT

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, search = false } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide chat messages."
      });
    }

    if (messages.length > 30) {
      return res.status(400).json({
        success: false,
        error: "Too many messages. Maximum is 30."
      });
    }

    const history = messages
      .filter(message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
      )
      .slice(-20)
      .map(message => ({
        role: message.role,
        content: message.content.slice(0, 4000)
      }));

    const lastMessage = history[history.length - 1];

    if (!lastMessage || lastMessage.role !== "user") {
      return res.status(400).json({
        success: false,
        error: "A user message is required."
      });
    }

    const ai = getAI();

    // Load memory safely

    let memory = [];

    try {
      memory = await getMemory("default");
    } catch (memoryError) {
      console.error("MEMORY READ ERROR:", memoryError.message);
    }

    // Optional web search

    let webContext = "";

    if (search === true) {
      try {
        const result = await searchWeb(ai, lastMessage.content);

        webContext =
          typeof result === "string"
            ? result
            : result?.answer || JSON.stringify(result);

      } catch (searchError) {
        console.error("WEB SEARCH ERROR:", searchError.message);
        webContext = "Web search was unavailable for this request.";
      }
    }

    const instructions = `
${PERSONALITY}

SAVED MEMORY:
${JSON.stringify(memory).slice(0, 5000)}

WEB RESEARCH:
${String(webContext).slice(0, 8000)}

Use saved memory and web research only when relevant.
Do not invent facts or claim unverified results.
`;

    // Generate AI response

    const response = await ai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      instructions,
      input: history
    });

    const reply = response.output_text;

    if (!reply) {
      throw new Error("Empty AI response received.");
    }

    // Save latest user message

    try {
      await addMemory("default", {
        role: "user",
        content: lastMessage.content.slice(0, 1000)
      });
    } catch (memoryError) {
      console.error("MEMORY SAVE ERROR:", memoryError.message);
    }

    return res.status(200).json({
      success: true,
      reply,
      personality: "ULTRON PRO TRINITY",
      webSearchUsed: search === true,
      memoryEnabled: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("ULTRON CHAT ERROR:", error.message);

    if (
      error.message === "OPENAI_API_KEY is not configured."
    ) {
      return res.status(503).json({
        success: false,
        error: "OpenAI API key is missing."
      });
    }

    return res.status(500).json({
      success: false,
      error: "ULTRON could not process this request."
    });
  }
});

// MEMORY STATUS

app.get("/api/memory/status", async (req, res) => {
  try {
    const status = await memoryStatus();

    return res.status(200).json({
      success: true,
      memory: status
    });

  } catch (error) {
    console.error("MEMORY STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Memory status unavailable."
    });
  }
});

// UNKNOWN API ROUTES

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found."
  });
});

// GENERAL ERROR HANDLER

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    error: "Internal server error."
  });
});

// START SERVER

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------");
  console.log("ULTRON PRO TRINITY ONLINE");
  console.log("JARVIS + ULTRON + VISION");
  console.log("NODE SERVER READY");
  console.log("PORT:", PORT);
  console.log("AI CONFIGURED:", Boolean(process.env.OPENAI_API_KEY));
  console.log("--------------------------------");
});

// Graceful shutdown

process.on("SIGTERM", () => {
  console.log("ULTRON shutting down...");

  server.close(() => {
    console.log("ULTRON server stopped.");
    process.exit(0);
  });
});
