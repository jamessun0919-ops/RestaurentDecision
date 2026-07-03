"use client";

import { useState } from "react";

export default function HomePage({
  onStart,
}: {
  onStart: (location: { lat: number; lng: number }) => void;
}) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function requestLocation() {
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("這個瀏覽器不支援定位功能，無法使用本服務。");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("無法取得你的位置授權，這個功能需要定位權限才能使用。");
        setLocating(false);
      }
    );
  }

  return (
    <div className="fixed inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public hero background, colors kept as-is by design */}
      <img
        src="/resdecbgpic.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute bottom-6 left-4 flex flex-col gap-2 w-48">
        {location ? (
          <p className="text-sm text-white bg-black/70 rounded-lg px-3 py-2 text-center">
            已取得目前位置
          </p>
        ) : (
          <button
            type="button"
            onClick={requestLocation}
            disabled={locating}
            className="border rounded-lg py-2 text-sm bg-white text-black disabled:opacity-40"
          >
            {locating ? "定位中..." : "取得目前位置"}
          </button>
        )}

        {locationError && (
          <p className="text-xs text-white bg-red-600/90 rounded-lg px-3 py-2">{locationError}</p>
        )}

        <button
          type="button"
          onClick={() => location && onStart(location)}
          disabled={!location}
          className="bg-black text-white rounded-lg py-3 font-semibold disabled:opacity-40"
        >
          開始推薦
        </button>
      </div>
    </div>
  );
}
