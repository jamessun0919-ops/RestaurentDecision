import { NextResponse } from "next/server";

const PHOTO_NAME_PATTERN = /^places\/[^/]+\/photos\/[^/]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !PHOTO_NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "無效的照片參數" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY 未設定" }, { status: 500 });
  }

  const googleUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${apiKey}`;
  const res = await fetch(googleUrl);

  if (!res.ok) {
    return NextResponse.json({ error: "取得照片失敗" }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
