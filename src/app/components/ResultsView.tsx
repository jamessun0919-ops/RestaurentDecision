"use client";

import { useEffect, useRef } from "react";
import { RecommendResponse, RestaurantCard } from "@/lib/types";

function formatPrice(priceLevel: number | null): string {
  if (priceLevel === null || priceLevel === 0) return "價位未提供";
  return "＄".repeat(priceLevel);
}

function RestaurantList({
  restaurants,
  selectedPlaceId,
  onSelect,
}: {
  restaurants: RestaurantCard[];
  selectedPlaceId: string | null;
  onSelect: (r: RestaurantCard) => void;
}) {
  if (restaurants.length === 0) {
    return <p className="text-sm text-gray-500">這一輪沒有找到符合條件的餐廳。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {restaurants.map((r) => (
        <div
          key={r.placeId}
          className="border rounded-xl overflow-hidden flex flex-col gap-2 bg-white text-black"
        >
          {r.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- same-origin proxy image, next/image adds no benefit here
            <img
              src={r.photoUrl}
              alt={r.name}
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              沒有商家照片
            </div>
          )}

          <div className="flex flex-col gap-2 p-4 pt-0">
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold">{r.name}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {r.distanceKm.toFixed(1)} 公里
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              {r.category && (
                <span className="bg-gray-100 rounded-full px-2 py-0.5">{r.category}</span>
              )}
              <span className="bg-gray-100 rounded-full px-2 py-0.5">
                {formatPrice(r.priceLevel)}
              </span>
            </div>

            <span className="text-sm text-gray-600">{r.address}</span>

            {r.reason && <p className="text-sm leading-relaxed">{r.reason}</p>}

            {selectedPlaceId === r.placeId ? (
              <a
                href={r.navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white rounded-lg py-2 text-center text-sm font-semibold"
              >
                開始導航
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="border rounded-lg py-2 text-sm bg-white text-black"
              >
                就選這家
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultSection({
  title,
  result,
  selectedPlaceId,
  onSelect,
}: {
  title?: string;
  result: RecommendResponse;
  selectedPlaceId: string | null;
  onSelect: (r: RestaurantCard) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {title && <h2 className="text-sm font-semibold text-gray-500">{title}</h2>}

      <p className="italic font-serif tracking-wide text-lg text-rose-800 leading-relaxed">
        {result.opening}
      </p>

      {result.relaxed && (
        <p className="text-xs text-amber-600">
          附近符合原條件的餐廳不夠多，已自動放寬距離與價位範圍。
        </p>
      )}

      <RestaurantList
        restaurants={result.restaurants}
        selectedPlaceId={selectedPlaceId}
        onSelect={onSelect}
      />
    </div>
  );
}

export default function ResultsView({
  round1,
  round2,
  loadingRound2,
  selectedPlaceId,
  onSelect,
  onRequestRound2,
}: {
  round1: RecommendResponse;
  round2: RecommendResponse | null;
  loadingRound2: boolean;
  selectedPlaceId: string | null;
  onSelect: (r: RestaurantCard, round: 1 | 2) => void;
  onRequestRound2: () => void;
}) {
  const round2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (round2) {
      round2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [round2]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto p-4">
      <ResultSection
        result={round1}
        selectedPlaceId={selectedPlaceId}
        onSelect={(r) => onSelect(r, 1)}
      />

      {!round2 && !selectedPlaceId && (
        <button
          type="button"
          onClick={onRequestRound2}
          disabled={loadingRound2}
          className="border rounded-lg py-3 text-sm font-semibold disabled:opacity-40 bg-white text-black"
        >
          {loadingRound2 ? "尋找中..." : "都不喜歡，幫我換一批"}
        </button>
      )}

      {round2 && (
        <div ref={round2Ref} className="border-t pt-6">
          <ResultSection
            title="次輪推薦"
            result={round2}
            selectedPlaceId={selectedPlaceId}
            onSelect={(r) => onSelect(r, 2)}
          />
        </div>
      )}
    </div>
  );
}
