import { DIETARY_RESTRICTION_INFO, MOOD_LABELS, MOOD_TIERS, MOTIVATION_KEYWORDS, MOTIVATION_LABELS } from "./dictionary";
import { refineSearchQuery } from "./openai";
import { buildNavigationUrl, haversineDistanceKm, PlaceCandidate, searchPlacesText } from "./places";
import { Mood, Motivation, PriceLevel, Profile, RestaurantCard, TierQueries } from "./types";

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

// Tier1 交給 OpenAI 依會員資料微調（唯一一次 LLM 呼叫），Tier2/Tier3 直接用字典字串組合，不呼叫 LLM。
// 這組字串跟距離/價位無關，首輪／換一批／放寬搜尋可以共用同一份（由呼叫端把 cached 傳進來），避免重複呼叫 LLM。
async function resolveTierQueries(
  mood: Mood,
  motivation: Motivation,
  profile: Profile,
  cached?: TierQueries
): Promise<TierQueries> {
  if (cached) return cached;

  const moodTiers = MOOD_TIERS[mood];
  const motivationKeywords = MOTIVATION_KEYWORDS[motivation];

  const tier1 = await refineSearchQuery(
    [...moodTiers.tier1, ...motivationKeywords],
    MOOD_LABELS[mood],
    MOTIVATION_LABELS[motivation],
    profile
  );
  const tier2 = moodTiers.tier2 ? [...moodTiers.tier2, ...motivationKeywords].join(" ") : null;
  const tier3 = [...moodTiers.tier3, ...motivationKeywords].join(" ");

  return { tier1, tier2, tier3 };
}

// 查一層關鍵字、套硬性過濾／排除清單／距離上限，累加進 merged，回傳目前累積後的排序結果。
async function searchTier(
  query: string,
  profile: Profile,
  lat: number,
  lng: number,
  radiusKm: number,
  priceLevel: PriceLevel,
  excludeIds: Set<string>,
  maxDistanceKm: number,
  merged: Map<string, PlaceCandidate>
): Promise<RestaurantCard[]> {
  const results = await searchPlacesText(query, lat, lng, radiusKm * 1000);
  const filtered = applyHardFilters(results, profile)
    .filter((r) => !excludeIds.has(r.placeId))
    .filter((r) => haversineDistanceKm(lat, lng, r.lat, r.lng) <= maxDistanceKm);

  for (const r of filtered) {
    if (!merged.has(r.placeId)) merged.set(r.placeId, r);
  }

  return rankCandidates(Array.from(merged.values()), priceLevel, lat, lng);
}

// 依交通工具的直覺分級：步行可接受範圍（<=2km）誤差容忍度低，倍數收緊；
// 開車可接受範圍（>5km）誤差容忍度高，倍數放寬。硬性上限一律以使用者原始輸入距離為準，
// 不論精準搜尋、保底救援還是次輪放寬都套用同一個上限，不會跟著放寬動作一起放大。
function computeMaxDistanceKm(distanceKm: number): number {
  if (distanceKm <= 2) return distanceKm * 1.2;
  if (distanceKm <= 5) return distanceKm * 1.5;
  return distanceKm * 2;
}

export interface Round1Result {
  restaurants: RestaurantCard[];
  rescued: boolean;
  tierQueries: TierQueries;
}

// 首輪：以精準為目標，只查 Tier1（不夠3家再查 Tier2，若該心情沒有 Tier2 則略過），
// 不做距離/價位放寬。只有在 Tier1+Tier2 完全查無結果（0筆）時才觸發保底救援：
// 改查 Tier3，還是0筆則再放寬一次距離（價位不動），確保下限至少 1 筆、避免 0 筆的畫面。
export async function getRound1Recommendations(params: {
  mood: Mood;
  motivation: Motivation;
  profile: Profile;
  lat: number;
  lng: number;
  distanceKm: number;
  priceLevel: PriceLevel;
}): Promise<Round1Result> {
  const excludeIds = new Set(params.profile.excludedPlaceIds);
  const tierQueries = await resolveTierQueries(params.mood, params.motivation, params.profile);
  const maxDistanceKm = computeMaxDistanceKm(params.distanceKm);
  const merged = new Map<string, PlaceCandidate>();

  const search = (query: string, radiusKm: number) =>
    searchTier(
      query,
      params.profile,
      params.lat,
      params.lng,
      radiusKm,
      params.priceLevel,
      excludeIds,
      maxDistanceKm,
      merged
    );

  let ranked = await search(tierQueries.tier1, params.distanceKm);

  if (ranked.length < 3 && tierQueries.tier2) {
    ranked = await search(tierQueries.tier2, params.distanceKm);
  }

  let rescued = false;
  if (ranked.length === 0) {
    rescued = true;
    ranked = await search(tierQueries.tier3, params.distanceKm);
    if (ranked.length === 0) {
      ranked = await search(tierQueries.tier3, params.distanceKm + 1);
    }
  }

  return { restaurants: ranked.slice(0, 3), rescued, tierQueries };
}

export interface RelaxedSearchResult {
  restaurants: RestaurantCard[];
  relaxed: boolean;
}

// 共用的「完整降級＋放寬」引擎：Tier1→2→3 依序查到湊滿 needed 筆為止；
// 全部查完還不夠，才放寬距離+1km、價位+1級，同一套 Tier 再查一次。
// 「換一批」（次輪）與「放寬搜尋」（首輪保底不足時的補足）都共用這個引擎，
// 差別只在 needed 筆數與排除清單。
async function runFullRelaxCascade(
  tierQueries: TierQueries,
  profile: Profile,
  lat: number,
  lng: number,
  distanceKm: number,
  priceLevel: PriceLevel,
  excludeIds: Set<string>,
  maxDistanceKm: number,
  needed: number
): Promise<RelaxedSearchResult> {
  const merged = new Map<string, PlaceCandidate>();
  const queries = [tierQueries.tier1, tierQueries.tier2, tierQueries.tier3].filter(
    (q): q is string => typeof q === "string"
  );

  let ranked: RestaurantCard[] = [];
  for (const query of queries) {
    ranked = await searchTier(query, profile, lat, lng, distanceKm, priceLevel, excludeIds, maxDistanceKm, merged);
    if (ranked.length >= needed) return { restaurants: ranked, relaxed: false };
  }

  const relaxedDistanceKm = distanceKm + 1;
  const relaxedPriceLevel = Math.min(priceLevel + 1, 4) as PriceLevel;
  for (const query of queries) {
    ranked = await searchTier(
      query,
      profile,
      lat,
      lng,
      relaxedDistanceKm,
      relaxedPriceLevel,
      excludeIds,
      maxDistanceKm,
      merged
    );
    if (ranked.length >= needed) return { restaurants: ranked, relaxed: true };
  }

  return { restaurants: ranked, relaxed: true };
}

export interface Round2Result {
  restaurants: RestaurantCard[];
  relaxed: boolean;
  tierQueries: TierQueries;
}

// 「都不喜歡，幫我換一批」：排除首輪已顯示的餐廳，重新湊一批3家（獨立於首輪的「次輪推薦」區塊）。
export async function getRound2Recommendations(params: {
  mood: Mood;
  motivation: Motivation;
  profile: Profile;
  lat: number;
  lng: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  excludePlaceIds: string[];
  tierQueries?: TierQueries;
}): Promise<Round2Result> {
  const excludeIds = new Set([...params.excludePlaceIds, ...params.profile.excludedPlaceIds]);
  const tierQueries = await resolveTierQueries(params.mood, params.motivation, params.profile, params.tierQueries);
  const maxDistanceKm = computeMaxDistanceKm(params.distanceKm);

  const { restaurants, relaxed } = await runFullRelaxCascade(
    tierQueries,
    params.profile,
    params.lat,
    params.lng,
    params.distanceKm,
    params.priceLevel,
    excludeIds,
    maxDistanceKm,
    3
  );

  return { restaurants: restaurants.slice(0, 3), relaxed, tierQueries };
}

// 「放寬搜尋」：首輪保底救援後選擇不多時，使用者主動要求補足。保留首輪已顯示的餐廳，
// 只補足到 3 家，回傳的是「新增的」餐廳（由呼叫端併入首輪清單），不是取代。
export async function getWidenRecommendations(params: {
  mood: Mood;
  motivation: Motivation;
  profile: Profile;
  lat: number;
  lng: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  excludePlaceIds: string[];
  tierQueries: TierQueries;
  needed: number;
}): Promise<{ restaurants: RestaurantCard[] }> {
  const excludeIds = new Set([...params.excludePlaceIds, ...params.profile.excludedPlaceIds]);
  const maxDistanceKm = computeMaxDistanceKm(params.distanceKm);

  const { restaurants } = await runFullRelaxCascade(
    params.tierQueries,
    params.profile,
    params.lat,
    params.lng,
    params.distanceKm,
    params.priceLevel,
    excludeIds,
    maxDistanceKm,
    params.needed
  );

  return { restaurants: restaurants.slice(0, params.needed) };
}
