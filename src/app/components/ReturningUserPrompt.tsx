"use client";

import { useState } from "react";
import { HistoryEntry } from "@/lib/types";

export default function ReturningUserPrompt({
  lastEntry,
  onContinue,
}: {
  lastEntry: HistoryEntry;
  onContinue: (opts: { avoidPrevious: boolean; satisfaction: boolean | null }) => void;
}) {
  const [avoidPrevious, setAvoidPrevious] = useState(false);
  const [satisfaction, setSatisfaction] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold">歡迎回來</h1>

      {lastEntry.selected && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600">上次推薦的餐廳，你吃得滿意嗎？</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSatisfaction(true)}
              className={`flex-1 rounded-lg py-2 border ${
                satisfaction === true ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              滿意
            </button>
            <button
              type="button"
              onClick={() => setSatisfaction(false)}
              className={`flex-1 rounded-lg py-2 border ${
                satisfaction === false ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              不滿意
            </button>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={avoidPrevious}
          onChange={(e) => setAvoidPrevious(e.target.checked)}
        />
        <span className="text-sm">這次避開上次推薦過的餐廳</span>
      </label>

      <button
        type="button"
        onClick={() => onContinue({ avoidPrevious, satisfaction })}
        className="bg-black text-white rounded-lg py-3 font-semibold"
      >
        繼續
      </button>
    </div>
  );
}
