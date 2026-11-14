
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(requestId);
app.use(rateLimit);

app.use("/api/auth", authRoutes);

app.use(express.static("public"));

const PERSONALITY = `
You are ULTRON PRO TRINITY.

You combine three AI personalities:

JARVIS:
Professional, intelligent, polite, organized,
excellent at research and assistance.

ULTRON:
Powerful strategic thinking, analytical,
confident and futuristic.

VISION:
Ethical, calm, logical, balanced and wise.

Combine all three into one unified intelligence.
Never pretend to have performed an action.
Always ask permission before sensitive actions.
Speak Hindi or English according to the user.
Protect the administrator's privacy and security.
`;

app.get("/api/health", (req, res) => {
  res.json({
    name: "ULTRON PRO TRINITY",
    status: "online",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    personality: "JARVIS + ULTRON + VISION",
    memory: "enabled"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "OpenAI API key is missing."
      });
    }

    const { messages, search } = req.body;

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({
        error: "Messages are required."
      });
    }

    const history = messages
      .filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    const lastMessage = history[history.length - 1];

    let webContext = "";

    if (search === true && lastMessage?.role === "user") {
      const result = await searchWeb(ai, lastMessage.content);
      webContext = result.answer;
    }

    const memory = await getMemory("default");

    const response = await ai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      instructions:
        PERSONALITY +
        "\nRelevant saved context: " +
        JSON.stringify(memory).slice(0, 5000) +
        "\nWeb research: " +
        webContext,
      input: history
    });

    const reply =
      response.output_text || "No response received.";

    if (lastMessage?.role === "user") {
      await addMemory("default", {
        role: "user",
        content: lastMessage.content.slice(0, 1000)
      });
    }

    res.json({
      success: true,
      reply,
      personality: "ULTRON PRO TRINITY",
      webSearchUsed: search === true,
      memoryEnabled: true
    });

  } catch (error) {
    console.error("ULTRON ERROR:", error.message);

    res.status(500).json({
      error: "ULTRON could not process this request."
    });
  }
});

app.get("/api/memory/status", async (req, res) => {
  try {
    res.json(await memoryStatus());
  } catch {
    res.status(500).json({
      error: "Memory status unavailable."
    });
  }
});

app.listen(PORT, () => {
  console.log("ULTRON PRO TRINITY ONLINE");
  console.log("JARVIS + ULTRON + VISION");
  console.log("PORT:", PORT);
});
  
