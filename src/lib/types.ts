export type Mood = "stressed" | "sad" | "happy" | "tired" | "angry" | "bored";

export type Motivation = "simple" | "gathering" | "treat" | "date" | "study";

export type PriceLevel = 1 | 2 | 3 | 4;

export type HealthGoal = "none" | "weight_loss" | "muscle_gain" | "glucose_control";

export type DietaryRestriction =
  | "vegan"
  | "egg_dairy_vegetarian"
  | "five_pungent_free"
  | "halal"
  | "seafood_allergy"
  | "nut_allergy";

export interface Profile {
  age: number | null;
  gender: string | null;
  healthGoal: HealthGoal;
  dietaryRestrictions: DietaryRestriction[];
  spicyLevel: 0 | 1 | 2 | 3;
  excludedPlaceIds: string[];
}

export const DEFAULT_PROFILE: Profile = {
  age: null,
  gender: null,
  healthGoal: "none",
  dietaryRestrictions: [],
  spicyLevel: 1,
  excludedPlaceIds: [],
};

export interface RecommendRequestBody {
  lat: number;
  lng: number;
  distanceKm: number;
  mood: Mood;
  motivation: Motivation;
  priceLevel: PriceLevel;
  profile: Profile;
  round: 1 | 2;
  excludePlaceIds?: string[];
}

export interface RestaurantCard {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: number | null;
  rating: number | null;
  priceMatched: boolean;
  distanceKm: number;
  navigationUrl: string;
  category: string | null;
  reason: string;
  photoUrl: string | null;
}

export interface RecommendResponse {
  round: 1 | 2;
  relaxed: boolean;
  opening: string;
  restaurants: RestaurantCard[];
}

export interface HistoryEntry {
  timestamp: string;
  mood: Mood;
  motivation: Motivation;
  priceLevel: PriceLevel;
  distanceKm: number;
  round: 1 | 2;
  recommended: string[];
  selected: string | null;
  satisfaction: boolean | null;
}
