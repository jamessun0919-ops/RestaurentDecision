# 用餐選擇小幫手

[![Demo](https://img.shields.io/badge/DEMO-Live-brightgreen?style=for-the-badge)](https://restaurent-decision.vercel.app)

## 專案目標 (Project Goal)
打造一個手機優先的網頁 App，讓使用者輸入座標、心情、動機、價位、距離（首次使用者另設定個人飲食偏好），透過 Google Places API 取得餐廳資料，並由 LLM 生成具同理心的自然語言推薦（3 間餐廳），支援未選中時的次輪放寬推薦。

## 已完成進度 (Completed)

### 技術棧（已定案並實作）
- **前端＋後端**：Next.js 16（App Router）+ TypeScript + Tailwind CSS，前後端同一個專案。
- **部署**：已部署至 Vercel（[restaurent-decision.vercel.app](https://restaurent-decision.vercel.app)）。
- **生成回覆的 LLM**：目前使用 **OpenAI API（`gpt-4o-mini`）**，程式碼在 `src/lib/openai.ts`。 **OpenAI `gpt-4o-mini`**（`OPENAI_API_KEY` 已儲值成功），已實測 `/api/recommend` 端對端成功。
- **餐廳資料**：Google Places API (New)，`places:searchText` 端點。
- **金鑰安全**：Google Places、OpenAI 金鑰都只存在後端 `.env.local`（已加入 `.gitignore`），前端從未直接呼叫這兩個外部 API，一律透過自家後端路由轉呼叫。
- **會員機制**：測試版不做登入帳密，個人化設定與歷史紀錄存在瀏覽器 `localStorage`。

### 程式碼結構
```
src/
  lib/
    types.ts        # 所有共用型別（Profile、RecommendRequestBody、RestaurantCard...）
    dictionary.ts    # 心情/動機 Tier 關鍵字表、健康方向/飲食限制對照表
    openai.ts        # 呼叫 OpenAI API：搜尋關鍵字微調、結構化生成推薦文案（zodResponseFormat）
    places.ts        # 呼叫 Google Places Text Search、距離計算、導航連結組字串
    recommend.ts      # 核心業務邏輯：Tier fallback 搜尋、硬性條件過濾、價位/距離排序、次輪放寬
    storage.ts        # localStorage 讀寫（profile.json / history.json 概念對應）
  app/
    page.tsx                  # 主頁面，管理整個流程的狀態機（profile-setup → returning-prompt → query → results）
    components/
      ProfileForm.tsx          # 會員資料設定表單
      QueryForm.tsx            # 心情/動機/價位/距離/定位查詢表單
      ReturningUserPrompt.tsx  # 回頭客詢問（避開前次餐廳／滿意度回饋）
      ResultsView.tsx          # 推薦結果顯示（首輪+次輪同頁捲動、餐廳卡片）
    api/
      recommend/route.ts       # POST，核心推薦流程的後端進入點
      photo/route.ts           # GET，餐廳照片代理（見下方說明）
```

### 已實作並端對端測試通過的功能（已用 OpenAI `gpt-4o-mini` 版本實測，`/api/recommend` 全流程正常）
- 會員資料設定（年齡、性別、健康方向、飲食限制、辣度接受度）。
- 心情（6 類）＋動機（5 類）＋價位＋距離＋定位的查詢表單。
- 後端依 Tier 表組基礎關鍵字 → 呼叫 LLM 依會員資料微調成最終搜尋字串 → 呼叫 Places API 搜尋 → 硬性條件過濾（素食欄位、海鮮/堅果過敏關鍵字避開）→ 價位符合優先＋距離排序 → 取前 3 筆。
  - 效能優化：搜尋字串只在 Tier1 呼叫一次 LLM，Tier2/Tier3 用字典字串組合不呼叫 LLM；次輪放寬距離/預算時重複使用同一組已算好的字串，不重新呼叫 LLM（因為這組字串跟距離/價位無關）。一次完整推薦（含次輪）LLM 呼叫次數從最多 7 次降到最多 2 次。
- 首輪未選中可觸發次輪：排除首輪 3 家，候選不足時自動放寬距離 +1km、價位等級 +1，**新版 UI 為單頁往下捲動**（次輪結果接在首輪下方，載入完成自動平滑捲動到次輪區塊，取代原本的分頁切換設計，對手機使用者更直覺）。
- 選中餐廳後提供 Google 導航連結（免另外呼叫 API，純組字串）。
- 回頭使用者會被詢問「避開前次餐廳」或「回饋前次滿意度」，寫入 `localStorage`。
- LLM 回覆為**結構化輸出**（`opening` 開場同理心語句＋每間餐廳各自的 `reason`），不再是一整段文字：
  - 開場語句獨立用斜體襯線字呈現，跟餐廳卡片視覺區隔。
  - 各餐廳的推薦理由直接放進該餐廳的卡片內。
- 餐廳卡片顯示：商家照片（見下）、名稱、距離、主要餐點類別（`primaryTypeDisplayName`）、價位（＄符號數量）、地址、推薦理由、選擇/導航按鈕。
- **商家照片代理路由**（`/api/photo`）：Google 照片網址需要帶 API 金鑰才能存取，不能直接讓前端 `<img>` 打 Google 網址（會外洩金鑰）。做法是後端自己多開一條路由，前端只拿到自家網址（如 `/api/photo?name=...`），實際跟 Google 要圖、帶金鑰的動作在後端完成，並驗證 `name` 參數格式避免被亂打參數濫用。
- 已修正深色模式造成「白字白底看不到」的 CSS bug（`globals.css` 移除跟隨系統深色模式的邏輯，加上 `color-scheme: light` 讓瀏覽器原生表單元件也強制淺色呈現）。
- 推薦結果新增硬性距離上限（使用者輸入距離的 2 倍），避免 Google Places `locationBias` 只是軟性偏好、偶爾回傳超遠結果的問題。

### 心情（6 類）與動機（5 類）關鍵字對照表
**心情**（Tier1→Tier2→Tier3 逐層放寬，候選不足 3 家才往下一層）：

| 心情 | Tier 1 | Tier 2 | Tier 3（保底） |
|---|---|---|---|
| 壓力大、焦慮 | 麻辣鍋、鹹酥雞、炸雞專賣 | 辣味、油炸、重口味 | restaurant |
| 悲傷、低落 | 甜點店、拉麵、燉飯、粥品 | 甜食、湯品、澱粉主食 | bakery / cafe / restaurant |
| 開心、想慶祝 | 燒烤吃到飽、牛排館、合菜餐廳 | 聚餐、精緻料理 | restaurant |
| 疲勞、需要專注 | 沙拉、雞胸肉便當、日式定食 | 清爽、高蛋白 | meal_takeaway / restaurant |
| 生氣、煩躁 | 燒烤、酸辣湯麵、涼麵 | 酸辣、冰品 | restaurant |
| 無聊、沒有特別感覺 | 排隊美食、話題新開店、街邊小吃 | 無（直接跳過） | restaurant |

**動機**（只有 Tier1，不做關鍵字層級放寬；候選不足時交給「次輪距離/預算放寬」機制處理）：

| 動機 | Tier 1 |
|---|---|
| 簡單吃 | 快餐、小吃、定食、便當店（type: meal_takeaway） |
| 聚會聚餐 | 合菜餐廳、火鍋店、燒烤店 |
| 犒賞自己 | 無菜單料理、鐵板燒、高級日式料理（搭配高 price_level） |
| 約會、兩人時光 | 氣氛餐廳、義式餐廳、景觀餐廳、燭光晚餐 |
| 讀書／辦公 | 咖啡廳、早午餐、連鎖速食店、自習咖啡空間（近似分類，Google 無久坐/插座欄位，準確度有限） |

### 會員個人資料（本機儲存，對應 `src/lib/types.ts` 的 `Profile`）
```json
{
  "age": 28,
  "gender": "female",
  "healthGoal": "glucose_control",
  "dietaryRestrictions": ["egg_dairy_vegetarian"],
  "spicyLevel": 1,
  "excludedPlaceIds": []
}
```
- `healthGoal`（軟性，單選）：`none | weight_loss | muscle_gain | glucose_control`
- `dietaryRestrictions`（**硬性**，可複選）：`vegan | egg_dairy_vegetarian | five_pungent_free | halal | seafood_allergy | nut_allergy`
  - 素食/清真類：用 Google `servesVegetarianFood` 欄位過濾。
  - 海鮮過敏、堅果過敏：關鍵字避開對應常見料理類別，**僅為盡力避開，非保證安全**，正式版 UI 已加免責聲明文字。
- `spicyLevel`（軟性）：0=不辣 / 1=小辣 / 2=中辣 / 3=大辣。

## 關鍵設定與上下文 (Key Context & Rules)
- 原始規劃文件：`RestaurentDecision.txt`（四階段實作計畫、原始 System Prompt 模板，為邏輯起點）。
- 專案規則：`rule.txt`（已透過 `CLAUDE.md` 的 `@rule.txt` 匯入，每次對話會自動套用）。
- **教學/實作紀錄**：`實作紀錄.md`，記錄每次改動的技術重點與原因，適合回顧學習。
- Google Places API 限制：`price_level` 僅 0–4 五級，無實際金額；無結構化過敏原/營養素資料；無法用文字搜尋星數門檻。
- LLM 模型：`gpt-4o-mini`（`src/lib/openai.ts` 裡的 `MODEL` 常數），選這個是因為這個任務（短篇關鍵字/JSON 生成）用最便宜的模型就夠了。
- Gemini、Claude 相關程式碼已移除（`GEMINI_API_KEY`、`ANTHROPIC_API_KEY` 還留在 `.env.local` 裡沒刪，但程式沒有再讀取它們，可忽略或之後清掉）。`.env.local` 裡另外還有 `OPENCODE_GO_API_KEY`、`OPENROUTER_API_KEY` 兩個目前程式沒用到的變數，用途未知，之後可以確認一下是否還需要。
- 重要教訓：**Gemini API 的計費是獨立的「Cloud Prepay」系統**，不會用到 Google Cloud 主控台顯示的一般試用額度／信用，這點跟 Places API（走一般 Cloud Billing）不一樣，如果之後又想用 Gemini，要記得這個差異。
- 重要教訓：**API 金鑰「建立成功」不代表「能用」**，Anthropic 允許先建立金鑰、呼叫時才檢查帳戶餘額，所以認證通過（400）不等於帳戶有錢（billing 錯誤訊息），除錯時要分開檢查。
- 使用者資料：測試版僅存瀏覽器本機 `localStorage`，無登入帳密、無資料庫、無跨裝置同步。
- 安全提醒：`GOOGLE_PLACES_API_KEY`、`OPENAI_API_KEY` 都在 `.env.local`（已 gitignore），任何會把外部 API 網址直接暴露給前端的功能（例如照片），都要透過後端路由代理，不能讓金鑰出現在瀏覽器可見的網址或程式碼裡。
