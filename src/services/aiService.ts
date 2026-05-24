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
    recommendation: "BUY" | "HOLD" | "SELL";
    should_buy: boolean;
    explanation: string;
};

type ChatMessage = {
    role: "system" | "user";
    content: string;
};

const API_KEY_STORAGE = "aiApiKey";

function getApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE) || "";
}

function buildMessages(metrics: AiMetrics): ChatMessage[] {
    return [
        {
            role: "system",
            content: `
You are a professional cryptocurrency analyst.

Analyze the provided cryptocurrency data and return ONLY valid JSON.

Required JSON format:
{
    "metrics": {
        "name": string,
        "usd_price_current": number,
        "usd_cap_market": number,
        "usd_h24_volume": number,
        "currency_in_d30_percentage_change_price": number | null,
        "currency_in_d60_percentage_change_price": number | null,
        "currency_in_d200_percentage_change_price": number | null
    },
  "recommendation": "BUY" | "HOLD" | "SELL",
    "should_buy": boolean,
    "explanation": string
}

Rules:
- Copy the metrics EXACTLY as received (do not change values)
- recommendation must be BUY / HOLD / SELL
- should_buy = true only if recommendation is BUY
- explanation must be short (2-3 sentences)
- No markdown
- No extra text
- No code blocks
- Only JSON
`
        },
        {
            role: "user",
                        content: JSON.stringify({ metrics }, null, 2)
        }
    ];
}

function extract(content: string): AiResult {
    try {
        const cleaned = content
            .replace(/```json|```/gi, "")
            .trim();

        const recommendationLineMatch = cleaned.match(/Recommendation:\s*(BUY|HOLD|SELL)/i);
        const explanationLineMatch = cleaned.match(/Explanation:\s*([\s\S]+)/i);

        if (recommendationLineMatch) {
            const recommendation = recommendationLineMatch[1].toUpperCase() as "BUY" | "HOLD" | "SELL";
            const explanationText = explanationLineMatch?.[1]?.trim();

            return {
                recommendation,
                should_buy: recommendation === "BUY",
                explanation: explanationText && explanationText.length > 0 ? explanationText : "No explanation",
            };
        }

        let parsed: unknown;

        try {
            parsed = JSON.parse(cleaned);
        } catch {
            const start = cleaned.indexOf("{");
            const end = cleaned.lastIndexOf("}");

            if (start === -1 || end === -1) {
                throw new Error("No JSON found");
            }

            parsed = JSON.parse(cleaned.slice(start, end + 1));
        }

        if (typeof parsed !== "object" || parsed === null) {
            throw new Error("Invalid JSON schema");
        }

        const data = parsed as {
            metrics?: unknown;
            recommendation?: unknown;
            Recommendation?: unknown;
            should_buy?: unknown;
            explanation?: unknown;
            Explanation?: unknown;
        };

        const recommendationRaw =
            data.recommendation ||
            data.Recommendation;

        const explanationRaw =
            data.explanation ||
            data.Explanation;

        if (data.metrics !== undefined && (typeof data.metrics !== "object" || data.metrics === null)) {
            throw new Error("Invalid metrics");
        }

        if (typeof recommendationRaw !== "string") {
            throw new Error("Invalid recommendation");
        }

        const recommendation = recommendationRaw.toUpperCase();

        if (!["BUY", "HOLD", "SELL"].includes(recommendation)) {
            throw new Error("Invalid value");
        }

        const explanation =
            typeof explanationRaw === "string" && explanationRaw.trim() !== ""
                ? explanationRaw.trim()
                : "No explanation";

        const shouldBuyByRule = recommendation === "BUY";

        return {
            recommendation: recommendation as "BUY" | "HOLD" | "SELL",
            should_buy: shouldBuyByRule,
            explanation,
        };

    } catch {
        return {
            recommendation: "HOLD",
            should_buy: false,
            explanation: "Failed to parse AI response",
        };
    }
}

async function callAI(messages: ChatMessage[], apiKey: string): Promise<AiResult> {
    if (!apiKey) {
        return { recommendation: "HOLD", should_buy: false, explanation: "Missing API key" };
    }

    const { data } = await axios.post("/api/ai", {
        messages,
        apiKey,
    });

    const content = data?.content;

    if (typeof content !== "string") {
        return {
            recommendation: "HOLD",
            should_buy: false,
            explanation: "No AI content returned",
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