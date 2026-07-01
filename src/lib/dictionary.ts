import { DietaryRestriction, HealthGoal, Mood, Motivation } from "./types";

interface MoodTiers {
  tier1: string[];
  tier2: string[] | null;
  tier3: string[];
}

export const MOOD_LABELS: Record<Mood, string> = {
  stressed: "壓力大、焦慮",
  sad: "悲傷、低落",
  happy: "開心、想慶祝",
  tired: "疲勞、需要專注",
  angry: "生氣、煩躁",
  bored: "無聊、沒有特別感覺",
};

export const MOOD_TIERS: Record<Mood, MoodTiers> = {
  stressed: {
    tier1: ["麻辣鍋", "鹹酥雞", "炸雞專賣"],
    tier2: ["辣味", "油炸", "重口味"],
    tier3: ["餐廳"],
  },
  sad: {
    tier1: ["甜點店", "拉麵", "燉飯", "粥品"],
    tier2: ["甜食", "湯品", "澱粉主食"],
    tier3: ["餐廳"],
  },
  happy: {
    tier1: ["燒烤吃到飽", "牛排館", "合菜餐廳"],
    tier2: ["聚餐", "精緻料理"],
    tier3: ["餐廳"],
  },
  tired: {
    tier1: ["沙拉", "雞胸肉便當", "日式定食"],
    tier2: ["清爽", "高蛋白"],
    tier3: ["餐廳"],
  },
  angry: {
    tier1: ["燒烤", "酸辣湯麵", "涼麵"],
    tier2: ["酸辣", "冰品"],
    tier3: ["餐廳"],
  },
  bored: {
    tier1: ["排隊美食", "話題新開店", "街邊小吃"],
    tier2: null,
    tier3: ["餐廳"],
  },
};

export const MOTIVATION_LABELS: Record<Motivation, string> = {
  simple: "簡單吃",
  gathering: "聚會聚餐",
  treat: "犒賞自己",
  date: "約會、兩人時光",
  study: "讀書／辦公",
};

export const MOTIVATION_KEYWORDS: Record<Motivation, string[]> = {
  simple: ["快餐", "小吃", "定食", "便當店"],
  gathering: ["合菜餐廳", "火鍋店", "燒烤店"],
  treat: ["無菜單料理", "鐵板燒", "高級日式料理"],
  date: ["氣氛餐廳", "義式餐廳", "景觀餐廳", "燭光晚餐"],
  study: ["咖啡廳", "早午餐", "連鎖速食店", "自習咖啡空間"],
};

export const HEALTH_GOAL_HINT: Record<HealthGoal, string | null> = {
  none: null,
  muscle_gain: "高蛋白：雞胸肉、牛排、優格吧、健身餐盒",
  glucose_control: "控糖：清蒸、水煮、未精緻穀物、少醬少糖",
  weight_loss: "減重：高纖維、蔬食、原型食物、優質蛋白質",
};

interface DietaryInfo {
  label: string;
  keywordToAdd?: string;
  requiresVegetarianField?: boolean;
  avoidTypes?: string[];
}

export const DIETARY_RESTRICTION_INFO: Record<DietaryRestriction, DietaryInfo> = {
  vegan: { label: "全素", keywordToAdd: "全素", requiresVegetarianField: true },
  egg_dairy_vegetarian: { label: "奶蛋素", keywordToAdd: "素食", requiresVegetarianField: true },
  five_pungent_free: { label: "五辛素", keywordToAdd: "五辛素" },
  halal: { label: "清真", keywordToAdd: "清真" },
  seafood_allergy: { label: "海鮮過敏", avoidTypes: ["seafood_restaurant"] },
  nut_allergy: { label: "堅果過敏", avoidTypes: ["thai_restaurant", "indonesian_restaurant"] },
};
