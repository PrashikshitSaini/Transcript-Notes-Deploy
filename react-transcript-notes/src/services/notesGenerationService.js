import axios from "axios";

const API_URL = "http://localhost:5000/api";

// Enhanced prompt for more visually engaging notes
const enhancedPrompt = `Create visually engaging, well-structured notes from this transcript.

Use varied Markdown formatting:
- Create a prominent main title with # and subtitles with ## and ###
- Use *italic* for emphasis and definitions
- Highlight key terms with **bold**
- Create bullet lists with - for main points
- Use numbered lists (1., 2.) for sequential information or steps
- Create > blockquotes for important quotes or statements
- Use dividers (---) to separate major sections
- Include code blocks with \`\`\` for technical content if relevant
- Use tables for comparing information when appropriate

Be sure to:
- Vary the formatting throughout (don't just use bullets for everything)
- Create a logical structure with clear sections
- Highlight 3-5 key concepts with bold text
- Use blockquotes for direct quotes from the transcript
- Keep the notes concise but comprehensive

Here's the transcript: `;

export const generateNotes = async (transcript) => {
  if (!transcript) {
    return "No transcript provided. Please record or upload audio first.";
  }

  try {
    // First try to use the local server
    const response = await axios.post(`${API_URL}/generate-notes`, {
      transcript,
    });
    if (response.data && response.data.notes) {
      return response.data.notes;
    }
    throw new Error("Invalid response from notes generation server");
  } catch (serverError) {
    console.error("Server error, using DeepSeek API directly:", serverError);

    // Check if DeepSeek API key is provided
    const deepseekApiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return "ERROR: DeepSeek API key is not configured. Please set REACT_APP_DEEPSEEK_API_KEY in your environment variables.";
    }

    try {
      const deepseekResponse = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                "You are a skilled note taker who creates visually engaging and well-formatted markdown notes without adding any extra content but make sure to generate notes from every important line from the transcript. The notes should be detailed, yet with no extra content from your side.",
            },
            {
              role: "user",
              content: enhancedPrompt + transcript,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${deepseekApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (deepseekResponse.data?.choices?.[0]?.message?.content) {
        return deepseekResponse.data.choices[0].message.content;
      }
      return "Could not generate notes via DeepSeek. The API response format was unexpected.";
    } catch (deepseekError) {
      console.error("Error using DeepSeek API:", deepseekError);
      return (
        "Error generating notes via DeepSeek: " +
        (deepseekError.response?.data?.error?.message ||
          deepseekError.message) +
        "\n\nPlease check your DeepSeek API key and internet connection."
      );
    }
  }
};
