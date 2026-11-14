
const MAX_QUERY_LENGTH = 2000;

export async function searchWeb(ai, query, model) {
  if (!ai) {
    throw new Error("AI client is not configured");
  }

  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Please provide a search query");
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error("Search query is too long");
  }

  if (!model) {
    throw new Error("AI model is not configured");
  }

  const response = await ai.responses.create({
    model,
    tools: [
      {
        type: "web_search"
      }
    ],
    tool_choice: "auto",
    instructions: `
      You are ULTRON PRO TRINITY Web Intelligence.

      Combine:
      JARVIS: Professional research.
      ULTRON: Strategic analysis.
      VISION: Ethical and balanced reasoning.

      Search the web when useful.
      Prefer reliable and recent sources.
      Answer in the user's language.
      Include source citations in your answer.
      Clearly distinguish facts from uncertainty.
      Never invent search results or sources.
    `,
    input: query.trim()
  });

  return {
    success: true,
    answer: response.output_text ||
      "No search response received.",
    engine: "ULTRON PRO WEB INTELLIGENCE"
  };
}

export default searchWeb;
                    
