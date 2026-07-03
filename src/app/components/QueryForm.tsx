"use client";

import { useState } from "react";
import { MOOD_LABELS, MOTIVATION_LABELS } from "@/lib/dictionary";
import { Mood, Motivation, PriceLevel } from "@/lib/types";

export interface QueryInput {
  mood: Mood;
  motivation: Motivation;
  priceLevel: PriceLevel;
  distanceKm: number;
  lat: number;
  lng: number;
}

const PRICE_OPTIONS: { value: PriceLevel; label: string }[] = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

export default function QueryForm({
  onSubmit,
  location,
}: {
  onSubmit: (input: QueryInput) => void;
  location: { lat: number; lng: number };
}) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [priceLevel, setPriceLevel] = useState<PriceLevel>(2);
  const [distanceKm, setDistanceKm] = useState(2);

  const canSubmit = mood && motivation;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold">今天想怎麼吃？</h1>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">你現在的心情</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MOOD_LABELS) as Mood[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`rounded-lg px-3 py-2 border text-sm ${
                mood === m ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {MOOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">用餐動機</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MOTIVATION_LABELS) as Motivation[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivation(m)}
              className={`rounded-lg px-3 py-2 border text-sm ${
                motivation === m ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {MOTIVATION_LABELS[m]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              mood: "bored",
              motivation: "study",
              priceLevel: 1,
              distanceKm: 0,
              lat: location.lat,
              lng: location.lng,
            })
          }
          className="rounded-lg px-3 py-2 border border-dashed border-red-400 text-sm text-red-600"
        >
          測試錯誤用（無聊＋讀書／辦公＋0公里＋$）
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">價位</span>
        <div className="grid grid-cols-4 gap-2">
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriceLevel(opt.value)}
              className={`rounded-lg px-2 py-2 border text-sm ${
                priceLevel === opt.value ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-600">距離：{distanceKm} 公里</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={distanceKm}
          onChange={(e) => setDistanceKm(Number(e.target.value))}
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          canSubmit &&
          onSubmit({ mood, motivation, priceLevel, distanceKm, lat: location.lat, lng: location.lng })
        }
        className="bg-black text-white rounded-lg py-3 font-semibold disabled:opacity-40"
      >
        幫我推薦餐廳
      </button>
    </div>
  );
}
