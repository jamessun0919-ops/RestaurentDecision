"use client";

import { useEffect, useState } from "react";
import ProfileForm from "./components/ProfileForm";
import QueryForm, { QueryInput } from "./components/QueryForm";
import ReturningUserPrompt from "./components/ReturningUserPrompt";
import ResultsView from "./components/ResultsView";
import {
  appendHistory,
  loadHistory,
  loadProfile,
  saveProfile,
  updateLastHistorySatisfaction,
  updateLastHistorySelection,
} from "@/lib/storage";
import { HistoryEntry, Profile, RecommendResponse, RestaurantCard } from "@/lib/types";

type Step = "loading" | "profile-setup" | "returning-prompt" | "query" | "results";

interface BootState {
  profile: Profile | null;
  history: HistoryEntry[];
  step: Step;
}

export default function Home() {
  const [boot, setBoot] = useState<BootState>({ profile: null, history: [], step: "loading" });
  const [queryInput, setQueryInput] = useState<QueryInput | null>(null);
  const [round1, setRound1] = useState<RecommendResponse | null>(null);
  const [round2, setRound2] = useState<RecommendResponse | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingRound2, setLoadingRound2] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    const h = loadHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage on mount, not derivable during render (SSR has no window)
    setBoot({
      profile: p,
      history: h,
      step: !p ? "profile-setup" : h.length > 0 ? "returning-prompt" : "query",
    });
  }, []);

  const { profile, history, step } = boot;

  function handleProfileSubmit(p: Profile) {
    saveProfile(p);
    setBoot((prev) => ({ ...prev, profile: p, step: prev.history.length > 0 ? "returning-prompt" : "query" }));
  }

  function handleReturningContinue(opts: { avoidPrevious: boolean; satisfaction: boolean | null }) {
    if (opts.satisfaction !== null) {
      updateLastHistorySatisfaction(opts.satisfaction);
    }
    if (opts.avoidPrevious && profile && history.length > 0) {
      const lastEntry = history[history.length - 1];
      const merged = Array.from(new Set([...profile.excludedPlaceIds, ...lastEntry.recommended]));
      const updated = { ...profile, excludedPlaceIds: merged };
      saveProfile(updated);
      setBoot((prev) => ({ ...prev, profile: updated, step: "query" }));
      return;
    }
    setBoot((prev) => ({ ...prev, step: "query" }));
  }

  async function callRecommend(
    input: QueryInput,
    round: 1 | 2,
    excludePlaceIds: string[]
  ): Promise<RecommendResponse> {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: input.lat,
        lng: input.lng,
        distanceKm: input.distanceKm,
        mood: input.mood,
        motivation: input.motivation,
        priceLevel: input.priceLevel,
        profile,
        round,
        excludePlaceIds,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "推薦服務發生錯誤");
    }
    return res.json();
  }

  async function handleQuerySubmit(input: QueryInput) {
    setError(null);
    setLoadingResults(true);
    setQueryInput(input);
    setRound1(null);
    setRound2(null);
    setSelectedPlaceId(null);
    try {
      const result = await callRecommend(input, 1, []);
      setRound1(result);
      appendHistory({
        timestamp: new Date().toISOString(),
        mood: input.mood,
        motivation: input.motivation,
        priceLevel: input.priceLevel,
        distanceKm: input.distanceKm,
        round: 1,
        recommended: result.restaurants.map((r) => r.placeId),
        selected: null,
        satisfaction: null,
      });
      setBoot((prev) => ({ ...prev, history: loadHistory(), step: "results" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setLoadingResults(false);
    }
  }

  async function handleRequestRound2() {
    if (!queryInput || !round1) return;
    setLoadingRound2(true);
    setError(null);
    try {
      const excludeIds = round1.restaurants.map((r) => r.placeId);
      const result = await callRecommend(queryInput, 2, excludeIds);
      setRound2(result);
      appendHistory({
        timestamp: new Date().toISOString(),
        mood: queryInput.mood,
        motivation: queryInput.motivation,
        priceLevel: queryInput.priceLevel,
        distanceKm: queryInput.distanceKm,
        round: 2,
        recommended: result.restaurants.map((r) => r.placeId),
        selected: null,
        satisfaction: null,
      });
      setBoot((prev) => ({ ...prev, history: loadHistory() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setLoadingRound2(false);
    }
  }

  function handleSelect(restaurant: RestaurantCard) {
    setSelectedPlaceId(restaurant.placeId);
    updateLastHistorySelection(restaurant.placeId);
    setBoot((prev) => ({ ...prev, history: loadHistory() }));
  }

  function startOver() {
    setBoot((prev) => ({ ...prev, step: "query" }));
    setRound1(null);
    setRound2(null);
    setQueryInput(null);
    setSelectedPlaceId(null);
    setError(null);
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans py-8">
      {error && (
        <div className="w-full max-w-md mx-auto px-4 mb-4">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        </div>
      )}

      {step === "loading" && <p className="text-sm text-gray-500">載入中...</p>}

      {step === "profile-setup" && <ProfileForm onSubmit={handleProfileSubmit} />}

      {step === "returning-prompt" && history.length > 0 && (
        <ReturningUserPrompt
          lastEntry={history[history.length - 1]}
          onContinue={handleReturningContinue}
        />
      )}

      {step === "query" && (
        <>
          <QueryForm onSubmit={handleQuerySubmit} />
          {loadingResults && <p className="text-sm text-gray-500 mt-4">搜尋餐廳中...</p>}
        </>
      )}

      {step === "results" && round1 && (
        <>
          <ResultsView
            round1={round1}
            round2={round2}
            loadingRound2={loadingRound2}
            selectedPlaceId={selectedPlaceId}
            onSelect={(r) => handleSelect(r)}
            onRequestRound2={handleRequestRound2}
          />
          <button
            type="button"
            onClick={startOver}
            className="text-sm text-gray-500 underline mt-4"
          >
            重新開始一次推薦
          </button>
        </>
      )}
    </div>
  );
}
