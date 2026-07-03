"use client";

import { useState } from "react";
import { DIETARY_RESTRICTION_INFO } from "@/lib/dictionary";
import { DEFAULT_PROFILE, DietaryRestriction, HealthGoal, Profile } from "@/lib/types";

const HEALTH_GOAL_OPTIONS: { value: HealthGoal; label: string }[] = [
  { value: "none", label: "沒有特別需求" },
  { value: "weight_loss", label: "減重" },
  { value: "muscle_gain", label: "增肌" },
  { value: "glucose_control", label: "控糖／低升糖" },
];

const SPICY_OPTIONS = ["不辣", "小辣", "中辣", "大辣"];

const ALLERGY_DISCLAIMER =
  "本功能依您提供的設定，提供非醫療的餐廳選擇建議，點餐及享用美食請遵守專業醫療建議。";

export default function ProfileForm({ onSubmit }: { onSubmit: (profile: Profile) => void }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [showAllergyDisclaimer, setShowAllergyDisclaimer] = useState(false);

  function toggleRestriction(r: DietaryRestriction) {
    const adding = !profile.dietaryRestrictions.includes(r);
    if (adding && (r === "seafood_allergy" || r === "nut_allergy")) {
      setShowAllergyDisclaimer(true);
    }
    setProfile((p) => ({
      ...p,
      dietaryRestrictions: p.dietaryRestrictions.includes(r)
        ? p.dietaryRestrictions.filter((x) => x !== r)
        : [...p.dietaryRestrictions, r],
    }));
  }

  return (
    <form
      className="flex flex-col gap-6 w-full max-w-md mx-auto p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(profile);
      }}
    >
      <h1 className="text-xl font-bold">先設定你的用餐偏好</h1>

      <div className="flex gap-4">
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-sm text-gray-600">年齡（選填）</span>
          <input
            type="number"
            min={1}
            max={120}
            className="border rounded-lg px-3 py-2"
            value={profile.age ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : null }))
            }
          />
        </label>
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-sm text-gray-600">性別（選填）</span>
          <select
            className="border rounded-lg px-3 py-2"
            value={profile.gender ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value || null }))}
          >
            <option value="">不透露</option>
            <option value="female">女</option>
            <option value="male">男</option>
            <option value="other">其他</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">健康管理方向</span>
        <div className="grid grid-cols-2 gap-2">
          {HEALTH_GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, healthGoal: opt.value }))}
              className={`rounded-lg px-3 py-2 border text-sm ${
                profile.healthGoal === opt.value
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">飲食限制（可複選）</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DIETARY_RESTRICTION_INFO) as DietaryRestriction[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleRestriction(key)}
              className={`rounded-lg px-3 py-2 border text-sm ${
                profile.dietaryRestrictions.includes(key)
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}
            >
              {DIETARY_RESTRICTION_INFO[key].label}
            </button>
          ))}
        </div>
        {profile.dietaryRestrictions.some(
          (r) => r === "seafood_allergy" || r === "nut_allergy"
        ) && (
          <p className="text-xs text-red-600">
            系統會盡量避開，但無法保證完全不含該成分，嚴重過敏請務必自行與店家確認。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">辣度接受度</span>
        <div className="grid grid-cols-4 gap-2">
          {SPICY_OPTIONS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, spicyLevel: idx as 0 | 1 | 2 | 3 }))}
              className={`rounded-lg px-2 py-2 border text-sm ${
                profile.spicyLevel === idx ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="bg-black text-white rounded-lg py-3 font-semibold">
        儲存並開始使用
      </button>

      {showAllergyDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-sm text-gray-800">{ALLERGY_DISCLAIMER}</p>
            <button
              type="button"
              onClick={() => setShowAllergyDisclaimer(false)}
              className="bg-black text-white rounded-lg py-2 font-semibold"
            >
              我已了解
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
