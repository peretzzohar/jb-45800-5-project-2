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
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    const content = completion?.choices?.[0]?.message?.content;

    if (!content) {
      return res.json({
        error: "Blocked or empty response",
        raw: completion,
      });
    }

    return res.json({ content });
  } catch (err) {
    console.error("AI ERROR:", err?.message || err);
    return res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(3001, () => {
  console.log("AI server running on http://localhost:3001");
});