import axios from "axios";
import { z } from "zod";

export type AiMetrics = {
  name: string;
  usd_price_current: number;
  usd_cap_market: number;
  usd_h24_volume: number;
  currency_in_d30_percentage_change_price: number | null;
  currency_in_d60_percentage_change_price: number | null;
  currency_in_d200_percentage_change_price: number | null;
};

export type AiResult = {
  should_buy: boolean;
  explanation: string;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

const API_KEY_STORAGE = "openAiApiKey";

const ResultSchema = z.object({
  should_buy: z.boolean(),
  explanation: z.string(),
});

function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

function buildMessages(metrics: AiMetrics): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Return ONLY JSON:
{
  "should_buy": boolean,
  "explanation": string
}`,
    },
    {
      role: "user",
      content: JSON.stringify(metrics),
    },
  ];
}

function safeParse(content: string): AiResult {
  try {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) throw new Error("No JSON found");

    const parsed = JSON.parse(match[0]);

    const validated = ResultSchema.safeParse(parsed);

    if (!validated.success) {
      throw new Error("Invalid schema");
    }

    return validated.data;
  } catch {
    return {
      should_buy: false,
      explanation: "AI returned invalid response",
    };
  }
}

async function callAI(messages: ChatMessage[], apiKey: string): Promise<AiResult> {
  if (!apiKey) {
    return {
      should_buy: false,
      explanation: "Missing API key",
    };
  }

  const { data } = await axios.post("http://localhost:3001/api/ai", {
    messages,
    apiKey,
  });

  if (typeof data?.content !== "string") {
    return {
      should_buy: false,
      explanation: "Invalid server response",
    };
  }

  return safeParse(data.content);
}

class AiService {
  async getRecommendation(metrics: AiMetrics): Promise<AiResult> {
    const apiKey = getApiKey();
    const messages = buildMessages(metrics);

    return callAI(messages, apiKey);
  }
}

export default new AiService();
