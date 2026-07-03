import { NextResponse } from "next/server";
import { MOOD_LABELS, MOTIVATION_LABELS } from "@/lib/dictionary";
import { generateReply } from "@/lib/openai";
import { getWidenRecommendations } from "@/lib/recommend";
import { WidenRequestBody, WidenResponse } from "@/lib/types";

export async function POST(request: Request) {
  let body: WidenRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const { lat, lng, distanceKm, mood, motivation, priceLevel, profile, tierQueries, excludePlaceIds, needed } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "缺少座標資訊" }, { status: 400 });
  }
  if (!tierQueries) {
    return NextResponse.json({ error: "缺少首輪搜尋字串" }, { status: 400 });
  }

  try {
    const { restaurants } = await getWidenRecommendations({
      mood,
      motivation,
      profile,
      lat,
      lng,
      distanceKm,
      priceLevel,
      excludePlaceIds: excludePlaceIds ?? [],
      tierQueries,
      needed,
    });

    const { reasons } = await generateReply(MOOD_LABELS[mood], MOTIVATION_LABELS[motivation], restaurants);

    const restaurantsWithReasons = restaurants.map((r) => ({
      ...r,
      reason: reasons.get(r.placeId) ?? "這間餐廳也符合你目前設定的條件，值得一試。",
    }));

    const response: WidenResponse = { restaurants: restaurantsWithReasons };
    return NextResponse.json(response);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
