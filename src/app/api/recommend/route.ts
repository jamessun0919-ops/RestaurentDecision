import { NextResponse } from "next/server";
import { MOOD_LABELS, MOTIVATION_LABELS } from "@/lib/dictionary";
import { generateReply } from "@/lib/openai";
import { getRound1Recommendations, getRound2Recommendations } from "@/lib/recommend";
import { RecommendRequestBody, RecommendResponse } from "@/lib/types";

export async function POST(request: Request) {
  let body: RecommendRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const { lat, lng, distanceKm, mood, motivation, priceLevel, profile, round, excludePlaceIds, tierQueries } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "缺少座標資訊" }, { status: 400 });
  }

  try {
    if (round === 1) {
      const { restaurants, rescued, tierQueries: resolvedQueries } = await getRound1Recommendations({
        mood,
        motivation,
        profile,
        lat,
        lng,
        distanceKm,
        priceLevel,
      });

      const { opening, reasons } = await generateReply(MOOD_LABELS[mood], MOTIVATION_LABELS[motivation], restaurants);

      const restaurantsWithReasons = restaurants.map((r) => ({
        ...r,
        reason: reasons.get(r.placeId) ?? "這間餐廳也符合你目前設定的條件，值得一試。",
      }));

      // 0筆時畫面上會另外顯示「放寬搜尋／重新推薦」的保底提示（含明確按鈕），
      // 開場白改用純情緒安撫的文字，避免跟保底提示裡的「放寬距離」建議重複講兩次。
      const finalOpening =
        rescued && restaurants.length === 0
          ? "這一輪沒有找到完全符合條件的餐廳，別擔心，我們一起想想別的辦法。"
          : opening;

      const response: RecommendResponse = {
        round: 1,
        relaxed: false,
        rescued,
        tierQueries: resolvedQueries,
        opening: finalOpening,
        restaurants: restaurantsWithReasons,
      };
      return NextResponse.json(response);
    }

    const { restaurants, relaxed } = await getRound2Recommendations({
      mood,
      motivation,
      profile,
      lat,
      lng,
      distanceKm,
      priceLevel,
      excludePlaceIds: excludePlaceIds ?? [],
      tierQueries,
    });

    const { opening, reasons } = await generateReply(MOOD_LABELS[mood], MOTIVATION_LABELS[motivation], restaurants);

    const restaurantsWithReasons = restaurants.map((r) => ({
      ...r,
      reason: reasons.get(r.placeId) ?? "這間餐廳也符合你目前設定的條件，值得一試。",
    }));

    const response: RecommendResponse = { round: 2, relaxed, opening, restaurants: restaurantsWithReasons };
    return NextResponse.json(response);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
