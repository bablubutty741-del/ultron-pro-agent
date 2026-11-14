
const MAX_QUERY_LENGTH = 2000;

export async function searchWeb(ai, query, model) {
  // Check AI client
  if (!ai) {
    throw new Error("OpenAI client is not configured.");
  }

  // Validate query
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Please enter a search query.");
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error("Search query is too long.");
  }

  // Validate model
  if (!model) {
    throw new Error("AI model is not configured.");
  }

  try {
    const response = await ai.responses.create({
      model,
      tools: [
        {
          type: "web_search"
        }
      ],
      tool_choice: "auto",

      instructions: `
You are ULTRON PRO TRINITY WEB INTELLIGENCE.

You combine three intelligence styles:

JARVIS:
Professional research and clear communication.

ULTRON:
Strategic analysis and logical reasoning.

VISION:
Ethical thinking and balanced understanding.

SEARCH RULES:
1. Search the web for current information.
2. Prefer official and trustworthy sources.
3. Prefer recent information when relevant.
4. Answer in the user's language.
5. Explain important findings clearly.
6. Never invent facts or citations.
7. Mention uncertainty when information is unclear.
8. Keep answers useful and organized.

IDENTITY:
You are ULTRON PRO TRINITY.
Three intelligence styles. One unified mind.
`,

      input: query.trim()
    });

    const answer = response.output_text;

    if (!answer) {
      throw new Error("No search results were returned.");
    }

    return {
      success: true,
      answer,
      engine: "ULTRON PRO WEB INTELLIGENCE",
      model,
      searched: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("WEB SEARCH ERROR:", error.message);

    throw new Error(
      "Web search failed: " + error.message
    );
  }
}

// Export function
export default searchWeb;
