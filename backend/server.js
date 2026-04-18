import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: ".env.development" });

const app = express();

app.use(cors());
app.use(express.json());

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "meta/llama-3.1-8b-instruct";

function normalizeAiResponse(content) {
  try {
    const trimmed = String(content || "").trim();
    const withoutCodeFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(withoutCodeFence);
    } catch {
      const firstBrace = withoutCodeFence.indexOf("{");
      const lastBrace = withoutCodeFence.lastIndexOf("}");

      if (firstBrace < 0 || lastBrace <= firstBrace) {
        throw new Error("No JSON found");
      }

      parsed = JSON.parse(withoutCodeFence.slice(firstBrace, lastBrace + 1));
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid JSON object");
    }

    const recommendation = parsed;
    if (typeof recommendation.should_buy !== "boolean") {
      throw new Error("Missing should_buy boolean");
    }

    return {
      should_buy: recommendation.should_buy,
      explanation:
        typeof recommendation.explanation === "string" && recommendation.explanation.trim() !== ""
          ? recommendation.explanation.trim()
          : "No explanation",
    };
  } catch {
    const preview = String(content || "").trim().slice(0, 500);
    return {
      should_buy: false,
      explanation: preview ? `Raw AI response: ${preview}` : "AI response was empty",
    };
  }
}

app.post("/api/ai", async (req, res) => {
  try {
    const { messages, apiKey } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    const key =
      typeof apiKey === "string" && apiKey.trim()
        ? apiKey.trim()
        : process.env.NVIDIA_API_KEY;

    if (!key) {
      return res.status(400).json({ error: "Missing API key" });
    }

    const client = new OpenAI({
      apiKey: key,
      baseURL: NVIDIA_BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a data analysis assistant. Respond ONLY with valid JSON. No extra text.",
        },
        ...messages,
      ],
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 500,
      stream: false,
    });

    console.log("RAW RESPONSE:", JSON.stringify(completion, null, 2));

   const content = completion?.choices?.[0]?.message?.content;

if (!content) {
    return res.json({
        error: "Blocked or empty response",
        raw: completion
    });
}

return res.json({ content });

    const result = normalizeAiResponse(content);
    return res.json(result);
  } catch (err) {
    console.error("AI ERROR:", err?.message || err);
    return res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(3001, () => {
  console.log("AI server running on http://localhost:3001");
});