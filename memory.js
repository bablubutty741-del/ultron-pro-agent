
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

const MAX_MESSAGES = 100;
const MAX_TEXT_LENGTH = 4000;

// Create memory storage
async function initializeMemory() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(MEMORY_FILE);
  } catch {
    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify({}, null, 2),
      "utf8"
    );
  }
}

// Validate session ID
function validateSessionId(id) {
  if (
    typeof id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(id)
  ) {
    throw new Error("Invalid session ID");
  }
}

// Read all memory
async function readAllMemory() {
  await initializeMemory();

  try {
    const data = await fs.readFile(
      MEMORY_FILE,
      "utf8"
    );

    return JSON.parse(data);
  } catch {
    throw new Error("Memory storage could not be read");
  }
}

// Save all memory
async function writeAllMemory(data) {
  await initializeMemory();

  const tempFile = MEMORY_FILE + ".tmp";

  await fs.writeFile(
    tempFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  await fs.rename(tempFile, MEMORY_FILE);
}

// Get conversation history
export async function getMemory(sessionId) {
  validateSessionId(sessionId);

  const memory = await readAllMemory();

  return memory[sessionId] || [];
}

// Save conversation history
export async function saveMemory(sessionId, messages) {
  validateSessionId(sessionId);

  if (!Array.isArray(messages)) {
    throw new Error("Messages must be an array");
  }

  const safeMessages = messages
    .filter(message =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string"
    )
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content.slice(
        0,
        MAX_TEXT_LENGTH
      ),
      timestamp: Date.now()
    }));

  const memory = await readAllMemory();

  memory[sessionId] = safeMessages;

  await writeAllMemory(memory);

  return {
    success: true,
    savedMessages: safeMessages.length
  };
}

// Add one conversation message
export async function addMemory(
  sessionId,
  role,
  content
) {
  validateSessionId(sessionId);

  if (!["user", "assistant"].includes(role)) {
    throw new Error("Invalid message role");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Invalid message content");
  }

  const memory = await readAllMemory();

  const messages = memory[sessionId] || [];

  messages.push({
    role,
    content: content.slice(0, MAX_TEXT_LENGTH),
    timestamp: Date.now()
  });

  memory[sessionId] = messages.slice(-MAX_MESSAGES);

  await writeAllMemory(memory);

  return {
    success: true,
    totalMessages: memory[sessionId].length
  };
}

// Clear one session's memory
export async function clearMemory(sessionId) {
  validateSessionId(sessionId);

  const memory = await readAllMemory();

  delete memory[sessionId];

  await writeAllMemory(memory);

  return {
    success: true,
    message: "Memory cleared successfully"
  };
}

// Memory system status
export async function memoryStatus() {
  const memory = await readAllMemory();

  return {
    status: "online",
    totalSessions: Object.keys(memory).length,
    maxMessagesPerSession: MAX_MESSAGES
  };
}

export default {
  getMemory,
  saveMemory,
  addMemory,
  clearMemory,
  memoryStatus
};
