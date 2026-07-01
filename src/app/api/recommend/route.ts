import { NextResponse } from "next/server";
import { MOOD_LABELS, MOTIVATION_LABELS } from "@/lib/dictionary";
import { generateReply } from "@/lib/claude";
import { getRecommendations } from "@/lib/recommend";
import { RecommendRequestBody, RecommendResponse } from "@/lib/types";

export async function POST(request: Request) {
  let body: RecommendRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const { lat, lng, distanceKm, mood, motivation, priceLevel, profile, round, excludePlaceIds } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "缺少座標資訊" }, { status: 400 });
  }

  try {
    const { restaurants, relaxed } = await getRecommendations({
      mood,
      motivation,
      profile,
      lat,
      lng,
      distanceKm,
      priceLevel,
      excludePlaceIds: round === 2 ? excludePlaceIds ?? [] : [],
    });

    const { opening, reasons } = await generateReply(
      MOOD_LABELS[mood],
      MOTIVATION_LABELS[motivation],
      restaurants
    );

    const restaurantsWithReasons = restaurants.map((r) => ({
      ...r,
      reason: reasons.get(r.placeId) ?? "這間餐廳也符合你目前設定的條件，值得一試。",
    }));

    const response: RecommendResponse = { round, relaxed, opening, restaurants: restaurantsWithReasons };
    return NextResponse.json(response);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
