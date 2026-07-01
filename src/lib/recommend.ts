import { DIETARY_RESTRICTION_INFO, MOOD_LABELS, MOOD_TIERS, MOTIVATION_KEYWORDS, MOTIVATION_LABELS } from "./dictionary";
import { refineSearchQuery } from "./claude";
import { buildNavigationUrl, haversineDistanceKm, PlaceCandidate, searchPlacesText } from "./places";
import { Mood, Motivation, PriceLevel, Profile, RestaurantCard } from "./types";

function applyHardFilters(candidates: PlaceCandidate[], profile: Profile): PlaceCandidate[] {
  const requiresVegetarian = profile.dietaryRestrictions.some(
    (r) => DIETARY_RESTRICTION_INFO[r].requiresVegetarianField
  );
  const avoidTypes = new Set(
    profile.dietaryRestrictions.flatMap((r) => DIETARY_RESTRICTION_INFO[r].avoidTypes ?? [])
  );

  return candidates.filter((c) => {
    if (requiresVegetarian && c.servesVegetarianFood !== true) return false;
    if (avoidTypes.size > 0 && c.types.some((t) => avoidTypes.has(t))) return false;
    return true;
  });
}

function rankCandidates(
  candidates: PlaceCandidate[],
  priceLevel: PriceLevel,
  lat: number,
  lng: number
): RestaurantCard[] {
  return candidates
    .map((c) => {
      const priceMatched = c.priceLevel === null || c.priceLevel === priceLevel;
      const distanceKm = haversineDistanceKm(lat, lng, c.lat, c.lng);
      return {
        placeId: c.placeId,
        name: c.name,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        priceLevel: c.priceLevel,
        rating: c.rating,
        priceMatched,
        distanceKm,
        navigationUrl: buildNavigationUrl(c.placeId, c.lat, c.lng),
        category: c.category,
        reason: "",
        photoUrl: c.photoName ? `/api/photo?name=${encodeURIComponent(c.photoName)}` : null,
      };
    })
    .sort((a, b) => {
      if (a.priceMatched !== b.priceMatched) return a.priceMatched ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });
}

// 每個 Tier 只算一次搜尋字串：Tier1 交給 Gemini 依會員資料微調（唯一一次 LLM 呼叫），
// Tier2/Tier3 是保底用的廣泛關鍵字，直接用字典字串組合，不再呼叫 LLM。
// 這組字串跟距離/價位無關，首輪與次輪放寬會共用同一份，避免重複呼叫 Gemini。
async function buildTierQueries(
  mood: Mood,
  motivation: Motivation,
  profile: Profile
): Promise<string[]> {
  const moodTiers = MOOD_TIERS[mood];
  const tierKeywordLists = [moodTiers.tier1, moodTiers.tier2, moodTiers.tier3].filter(
    (t): t is string[] => Array.isArray(t)
  );

  const queries: string[] = [];
  for (let i = 0; i < tierKeywordLists.length; i++) {
    const baseKeywords = [...tierKeywordLists[i], ...MOTIVATION_KEYWORDS[motivation]];
    if (i === 0) {
      queries.push(
        await refineSearchQuery(baseKeywords, MOOD_LABELS[mood], MOTIVATION_LABELS[motivation], profile)
      );
    } else {
      queries.push(baseKeywords.join(" "));
    }
  }
  return queries;
}

async function runTieredSearch(
  queries: string[],
  profile: Profile,
  lat: number,
  lng: number,
  distanceKm: number,
  priceLevel: PriceLevel,
  excludeIds: Set<string>
): Promise<RestaurantCard[]> {
  const merged = new Map<string, PlaceCandidate>();

  for (const query of queries) {
    const results = await searchPlacesText(query, lat, lng, distanceKm * 1000);
    const filtered = applyHardFilters(results, profile).filter((r) => !excludeIds.has(r.placeId));

    for (const r of filtered) {
      if (!merged.has(r.placeId)) merged.set(r.placeId, r);
    }

    const ranked = rankCandidates(Array.from(merged.values()), priceLevel, lat, lng);
    if (ranked.length >= 3) return ranked;
  }

  return rankCandidates(Array.from(merged.values()), priceLevel, lat, lng);
}

export interface RecommendResult {
  restaurants: RestaurantCard[];
  relaxed: boolean;
}

export async function getRecommendations(params: {
  mood: Mood;
  motivation: Motivation;
  profile: Profile;
  lat: number;
  lng: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  excludePlaceIds: string[];
}): Promise<RecommendResult> {
  const excludeIds = new Set([...params.excludePlaceIds, ...params.profile.excludedPlaceIds]);
  const queries = await buildTierQueries(params.mood, params.motivation, params.profile);

  let ranked = await runTieredSearch(
    queries,
    params.profile,
    params.lat,
    params.lng,
    params.distanceKm,
    params.priceLevel,
    excludeIds
  );

  let relaxed = false;

  if (ranked.length < 3) {
    relaxed = true;
    const relaxedDistanceKm = params.distanceKm + 1;
    const relaxedPriceLevel = Math.min(params.priceLevel + 1, 4) as PriceLevel;
    const relaxedRanked = await runTieredSearch(
      queries,
      params.profile,
      params.lat,
      params.lng,
      relaxedDistanceKm,
      relaxedPriceLevel,
      excludeIds
    );
    const merged = new Map<string, RestaurantCard>();
    for (const r of [...ranked, ...relaxedRanked]) {
      if (!merged.has(r.placeId)) merged.set(r.placeId, r);
    }
    ranked = Array.from(merged.values()).sort((a, b) => {
      if (a.priceMatched !== b.priceMatched) return a.priceMatched ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });
  }

  return { restaurants: ranked.slice(0, 3), relaxed };
}
