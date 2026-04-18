import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user"]),
      content: z.string(),
    })
  ),
  apiKey: z.string(),
});

app.post("/api/ai", async (req, res) => {
  try {
    const parsedBody = BodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid request body",
      });
    }

    const { messages, apiKey } = parsedBody.data;

    const endpoint = apiKey.startsWith("nvapi-")
      ? "https://integrate.api.nvidia.com/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const model = apiKey.startsWith("nvapi-")
      ? "nvidia/llama-3.1-nemotron-safety-guard-8b-v3"
      : "gpt-4o-mini";

    const response = await axios.post(
      endpoint,
      {
        model,
        messages,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "Empty AI response",
      });
    }

    res.json({ content });
  } catch (err) {
    console.error(err?.response?.data || err.message);

    res.status(500).json({
      error: "AI request failed",
    });
  }
});

app.listen(3001, () => {
  console.log("🚀 AI server running on http://localhost:3001");
});