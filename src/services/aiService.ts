import axios from "axios";

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

function getApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE) || "";
}

function buildMessages(metrics: AiMetrics): ChatMessage[] {
    return [
        {
            role: "system",
            content: `
You are a data analysis assistant.

You analyze numeric data and return a decision.

Return ONLY valid JSON:

{
  "should_buy": boolean,
  "explanation": string
}

Rules:
- Only JSON
- No markdown
- No extra text
- Keep explanation short
`
        },
        {
            role: "user",
            content: `Analyze this data:\n${JSON.stringify(metrics, null, 2)}`
        }
    ];
}
function extract(content: string): AiResult {
    try {
        console.log("RAW AI:", content);

        const trimmed = content.trim();
        const withoutCodeFence = trimmed
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let parsed: unknown;
        try {
            parsed = JSON.parse(withoutCodeFence);
        } catch {
            const firstBrace = withoutCodeFence.indexOf("{");
            const lastBrace = withoutCodeFence.lastIndexOf("}");

            if (firstBrace < 0 || lastBrace <= firstBrace) {
                throw new Error("No JSON found");
            }

            const jsonCandidate = withoutCodeFence.slice(firstBrace, lastBrace + 1).trim();
            parsed = JSON.parse(jsonCandidate);
        }

        if (typeof parsed !== "object" || parsed === null) {
            throw new Error("Invalid schema");
        }

        const recommendation = parsed as {
            should_buy?: unknown;
            explanation?: unknown;
        };

        if (typeof recommendation.should_buy !== "boolean") {
            throw new Error("Invalid schema");
        }

        return {
            should_buy: recommendation.should_buy,
            explanation:
                typeof recommendation.explanation === "string" && recommendation.explanation.trim() !== ""
                    ? recommendation.explanation.trim()
                    : "No explanation",
        };
    } catch {
        console.error("PARSE FAILED:", content);

        const preview = content.trim().slice(0, 500);

        return {
            should_buy: false,
            explanation: preview ? `Raw AI response: ${preview}` : "AI response was empty",
        };
    }
}

async function callAI(messages: ChatMessage[], apiKey: string): Promise<AiResult> {
    if (!apiKey) {
        return { should_buy: false, explanation: "Missing API key" };
    }

    const { data } = await axios.post("http://localhost:3001/api/ai", {
        messages,
        apiKey,
    });

    const content = data?.content;

    if (typeof content !== "string") {
        console.error("BAD RESPONSE:", data);
        return {
            should_buy: false,
            explanation: "No AI content returned (likely blocked or safety filter)",
        };
    }

    return extract(content);
}

class AiService {
    async getRecommendation(metrics: AiMetrics): Promise<AiResult> {
        const apiKey = getApiKey();
        const messages = buildMessages(metrics);

        return callAI(messages, apiKey);
    }
}

export default new AiService();
