export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: number | null;
  rating: number | null;
  servesVegetarianFood: boolean | null;
  types: string[];
  category: string | null;
  photoName: string | null;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  priceLevel?: string;
  rating?: number;
  servesVegetarianFood?: boolean;
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  photos?: { name: string }[];
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.priceLevel",
  "places.rating",
  "places.servesVegetarianFood",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.photos",
].join(",");

export async function searchPlacesText(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<PlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY 未設定");
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50000),
        },
      },
      rankPreference: "DISTANCE",
      maxResultCount: 20,
      languageCode: "zh-TW",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places API 錯誤 (${res.status}): ${errText}`);
  }

  const data: { places?: RawPlace[] } = await res.json();
  const places = data.places ?? [];

  return places
    .filter((p): p is RawPlace & { location: { latitude: number; longitude: number } } =>
      Boolean(p.location)
    )
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "未命名餐廳",
      address: p.formattedAddress ?? "",
      lat: p.location.latitude,
      lng: p.location.longitude,
      priceLevel: p.priceLevel ? PRICE_LEVEL_MAP[p.priceLevel] ?? null : null,
      rating: p.rating ?? null,
      servesVegetarianFood:
        typeof p.servesVegetarianFood === "boolean" ? p.servesVegetarianFood : null,
      types: p.types ?? [],
      category: p.primaryTypeDisplayName?.text ?? null,
      photoName: p.photos?.[0]?.name ?? null,
    }));
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function buildNavigationUrl(placeId: string, lat: number, lng: number): string {
  const destination = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${placeId}`;
}
