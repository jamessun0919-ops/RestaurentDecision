import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { DIETARY_RESTRICTION_INFO, HEALTH_GOAL_HINT } from "./dictionary";
import { Profile, RestaurantCard } from "./types";

const MODEL = "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未設定");
  }
  return new OpenAI({ apiKey });
}

const SPICY_LABELS = ["不辣", "小辣", "中辣", "大辣"];

export async function refineSearchQuery(
  baseKeywords: string[],
  moodLabel: string | null,
  motivationLabel: string | null,
  profile: Profile
): Promise<string> {
  const dietaryLabels = profile.dietaryRestrictions.map(
    (r) => DIETARY_RESTRICTION_INFO[r].label
  );
  const healthHint = HEALTH_GOAL_HINT[profile.healthGoal];

  const dimensionLines = [
    moodLabel !== null ? `心情：${moodLabel}` : null,
    motivationLabel !== null ? `動機：${motivationLabel}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const prompt = `你是餐廳搜尋關鍵字生成器。根據以下基礎關鍵字與使用者的個人飲食限制，產生一個給 Google Maps 搜尋用的繁體中文查詢字串（不超過 15 個字，只能輸出查詢字串本身，不要加引號、不要有其他說明文字）。

${dimensionLines}
基礎關鍵字：${baseKeywords.join("、")}
使用者辣度接受度：${SPICY_LABELS[profile.spicyLevel]}
使用者健康方向：${healthHint ?? "無特別需求"}
飲食限制（必須遵守）：${dietaryLabels.length > 0 ? dietaryLabels.join("、") : "無"}

規則：
- 保留基礎關鍵字的核心情緒/風格意圖。
- 若飲食限制與基礎關鍵字衝突（例如限制是素食但關鍵字是鹹酥雞），必須修改成符合限制的版本。
- 若辣度接受度是不辣，避免辣味類詞彙。
- 只輸出查詢字串本身。`;

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_completion_tokens: 60,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI API 沒有回傳文字內容");
  }
  return text.trim();
}

export interface GeneratedReply {
  opening: string;
  reasons: Map<string, string>;
}

const ReplySchema = z.object({
  opening: z.string(),
  reasons: z.array(
    z.object({
      placeId: z.string(),
      reason: z.string(),
    })
  ),
});

export async function generateReply(
  moodLabel: string,
  motivationLabel: string,
  restaurants: RestaurantCard[]
): Promise<GeneratedReply> {
  if (restaurants.length === 0) {
    return {
      opening: "附近暫時找不到符合條件的餐廳，要不要放寬一下距離或價位範圍再試一次？",
      reasons: new Map(),
    };
  }

  const restaurantList = restaurants
    .map(
      (r) =>
        `- placeId: ${r.placeId}｜名稱: ${r.name}｜距離約 ${r.distanceKm.toFixed(1)} 公里`
    )
    .join("\n");

  const prompt = `你現在是使用者的專屬「用餐選擇小幫手」。你的任務是根據使用者當下的心理狀態與客觀條件，給予最貼心、最符合需求的餐廳推薦。

【使用者當前參數】
當下心情：${moodLabel}
用餐動機：${motivationLabel}

【候選餐廳】
${restaurantList}

【輸出要求】
1. opening：一句充滿同理心與溫度的話語，承接使用者的心情（不要提到任何餐廳名稱）。
2. reasons：針對上面每一間餐廳各一筆，placeId 必須完全複製候選清單中的 placeId，reason 用 2-3 句話說明該餐廳為何能滿足使用者當下的心情與動機。`;

  const response = await getClient().chat.completions.parse({
    model: MODEL,
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(ReplySchema, "reply"),
  });

  const parsed = response.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("OpenAI API 回傳的推薦內容格式錯誤");
  }

  return {
    opening: parsed.opening,
    reasons: new Map(parsed.reasons.map((r) => [r.placeId, r.reason])),
  };
}
