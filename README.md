# 用餐選擇小幫手

　　提供充分貼近日常生活需求的功能，減少每日外出用餐的選擇困難。相較於市面上的同類型app產品，本專案加入與LLM的串接，能夠處理更多使用者輸入的條件特徵，例如使用者的<mark>健康資料(年齡、性別)、健康管理需求(增肌、減脂、控醣)、飲食偏好(素食類型／辣味)</mark>等固定條件，合併<mark>當日心情與用餐動機</mark>的變動條件，再輔以<mark>預算與距離</mark>等限制條件，生成最佳的搜尋prompt，以提供最符合使用者條件的用餐選擇。

　　本專案在推薦餐廳的機制方面，通過AI的協助設計了<mark>兼顧精準推薦與放寬搜尋</mark>的功能。若使用者身處於餐飲選擇密集的都會區（大學、辦公區、醫院、商場、美食街）區域，首輪能提供較多的選擇時，提供精準符合使用者條件的推薦。在相對偏遠(景點、鄉村、住宅區)的區域，設計了放寬tier與合理提升搜尋距離的次輪搜尋機制，提供全方面穩定的餐廳資訊。

　　在使用者的體驗感方面，本專案採輕量版的網頁設計，無繁瑣的註冊與登錄，無擾人的商業廣告。個人化設定與歷史紀錄僅存在瀏覽器內存中(可一鍵清除)，可簡單回饋前次推薦的滿意度，並選擇是否避開前次推薦的餐廳增加新鮮感。


[![Demo](https://img.shields.io/badge/DEMO-Live-brightgreen?style=for-the-badge)](https://restaurent-decision.vercel.app)

## 專案摘要 (Project Abstract)
隨著人工智慧與大型語言模型（LLM）技術的快速發展，個人化推薦系統的應用範圍不斷擴大，也帶動了將 LLM 應用於日常決策情境（例如「今天要吃什麼」）的研究興趣。然而，現有的餐廳推薦類 App 多半僅提供靜態條件篩選（餐飲類型、價位、距離），未能納入使用者當下的心情、用餐動機與個人健康限制等動態因素，導致使用者在餐飲選擇密集的都會區面臨選項過多、或在餐飲選擇稀疏的郊區面臨選項不足時，皆容易產生「選擇困難」。為解決此問題，本研究提出一套整合固定條件（年齡、性別、健康管理需求、飲食限制）、變動條件（當日心情與用餐動機）與限制條件（預算、距離）的方案，透過 LLM 生成搜尋 prompt，並設計「精準優先、逐層放寬」的搜尋機制。在方法設計上，系統依心情（6類）與動機（5類）建立分層關鍵字對照表，由 LLM（GPT-4o-mini）依會員資料微調搜尋關鍵字後，呼叫 Google Places API（New）並加上距離排序參數進行查詢，再依飲食限制/過敏條件做硬性過濾，並依交通工具可達範圍設定分級距離上限，搭配「首輪精準／換一批／放寬搜尋」三段式機制平衡精準度與涵蓋率。為評估本方案成效，我們分別在都會密集區（如大學城、商圈）與郊區稀疏區進行端對端測試，並在正式部署環境（Vercel）驗證各 API 端點與行動裝置使用流程。結果顯示，加入距離排序參數後，郊區2公里範圍內的合法候選比例由約一成大幅提升至近乎百分之百，同時都會區的推薦品質與涵蓋率維持穩定，證實了以 LLM 為核心、結合情境與硬性限制條件的推薦機制，能有效降低使用者的選擇疲勞。

With the rapid advancement of AI-driven personalization, large language models (LLMs) have opened new possibilities for context-aware recommendation systems, motivating growing research interest in applying LLMs beyond simple keyword search to everyday decision-making tasks such as choosing where to eat. However, existing restaurant recommendation apps typically rely on static filters (cuisine type, price, distance) and fail to incorporate dynamic, personally relevant signals—such as a user's momentary mood, dining motivation, and individual health constraints—resulting in decision paralysis, especially when users face either an overwhelming number of choices in dense urban areas or too few viable options in sparse suburban regions. To address this, we propose a novel scheme that fuses static user profile data (age, gender, health goals, dietary restrictions), dynamic contextual inputs (mood and motivation), and hard constraints (budget and distance) into an LLM-generated search prompt, coupled with a precision-first, tier-based fallback search mechanism. Our system is built on a tiered mood/motivation keyword dictionary (6 mood and 5 motivation categories), where an LLM (GPT-4o-mini) refines base keywords according to user profile before querying the Google Places API (New) with distance-based ranking; results are further filtered by dietary/allergy constraints and bounded by transportation-mode-aware distance caps, with a two-round precise-then-widen mechanism to balance accuracy and coverage. To evaluate our proposed scheme, we conducted end-to-end testing across both dense urban (university/commercial areas) and sparse suburban locations, and validated the deployed production system (Vercel) across all API endpoints and mobile user flows. Results show that combining explicit distance-rank preference with tiered fallback search substantially improves the proportion of valid in-range recommendations in low-density areas (from roughly 10% to nearly 100% within a 2km radius), while maintaining stable, non-overwhelming recommendation quality in high-density regions—demonstrating the feasibility of LLM-mediated, context-aware restaurant recommendation for reducing decision fatigue.

## 計畫架構 (Architecture)

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
    recommend.ts      # 核心業務邏輯：首輪精準搜尋、保底救援、共用的完整降級放寬引擎（換一批／放寬搜尋共用）
    storage.ts        # localStorage 讀寫（profile.json / history.json 概念對應）
  app/
    page.tsx                  # 主頁面，管理整個流程的狀態機（home → profile-setup → returning-prompt → query → results）
    components/
      HomePage.tsx             # 首頁（連線後第一個畫面）：全螢幕大圖＋定位／開始推薦按鈕
      ProfileForm.tsx          # 會員資料設定表單
      QueryForm.tsx            # 心情/動機/價位/距離查詢表單（定位已在首頁取得，這裡只接收）
      ReturningUserPrompt.tsx  # 回頭客詢問（避開前次餐廳／滿意度回饋）
      ResultsView.tsx          # 推薦結果顯示（首輪+次輪同頁捲動、餐廳卡片、保底提示）
    api/
      recommend/route.ts       # POST，首輪（round=1）與換一批（round=2）的後端進入點
      recommend/widen/route.ts # POST，「放寬搜尋」補足動作的後端進入點
      photo/route.ts           # GET，餐廳照片代理（見下方說明）
```

## 已完成進度 (Completed)

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

### 使用體驗優化
- **距離上限分級**：見上方，把原本單一 2 倍的粗略上限，依距離區間拆成三段更貼近實際交通工具誤差容忍度的倍數。
- **過敏免責聲明彈窗**：使用者在會員資料設定勾選「海鮮過敏」或「堅果過敏」時跳出彈窗，顯示「本功能依您提供的設定，提供非醫療的餐廳選擇建議，點餐及享用美食請遵守專業醫療建議。」需點擊「我已了解」才能關閉。
- **首輪改為「精準優先」**：原本首輪內部會自動降級＋自動放寬距離/價位湊滿3家，使用者完全不知情；改成首輪只用精準關鍵字，允許顯示少於3家甚至0家，選擇不多時明確詢問使用者要「放寬搜尋」還是「重新推薦」，而不是替使用者默默做決定。0筆與1~2筆的文案分開撰寫，避免重複講同一句「要不要放寬」。
- **多地點瀏覽器實測，驗證保底提示在不同人口密度下的表現**：都市型大學城（國立中興大學）一般距離可直接湊滿3家，縮小範圍才觸發保底；郊區型大學城（國立中正大學）連一般距離都可能直接是真實0筆，確認開場白、清單空狀態、保底提示三段文案不會互相重複。

### 已實作並端對端測試通過的功能（已用 OpenAI `gpt-4o-mini` 版本實測，`/api/recommend` 全流程正常）
- 首頁（`HomePage.tsx`）：使用者一連線就先看到，取得定位＋按「開始推薦」後才進入會員資料/查詢流程。
- 會員資料設定（年齡、性別、健康方向、飲食限制、辣度接受度）。
- 心情（6 類）＋動機（5 類）＋價位＋距離的查詢表單（定位已在首頁取得）。
- 後端依 Tier 表組基礎關鍵字 → 呼叫 LLM 依會員資料微調成最終搜尋字串 → 呼叫 Places API 搜尋 → 硬性條件過濾（素食欄位、海鮮/堅果過敏關鍵字避開）→ 價位符合優先＋距離排序。
  - 效能優化：搜尋字串只在 Tier1 呼叫一次 LLM，Tier2/Tier3 用字典字串組合不呼叫 LLM；首輪算出的搜尋字串會回傳給前端，「換一批」「放寬搜尋」都重複使用，不重新呼叫 LLM。
- **首輪／換一批／放寬搜尋** 三段式機制：首輪只用精準關鍵字（Tier1+Tier2），不做距離/價位放寬，允許顯示 0～3 家；只有完全查無結果才觸發保底救援（改查 Tier3、必要時距離+1km）。「換一批」與「放寬搜尋」共用同一套完整降級放寬引擎（Tier1→2→3，還不夠再放寬距離+1km、價位+1級），差別在於「換一批」湊滿全新3家（獨立次輪區塊），「放寬搜尋」只補首輪的差額並併入原清單。首輪選擇少於3家時，畫面會明確詢問使用者「放寬搜尋」或「重新推薦」。
- 首輪未選中可另外觸發次輪：排除首輪已顯示的餐廳，湊一批全新3家，**新版 UI 為單頁往下捲動**（次輪結果接在首輪下方，載入完成自動平滑捲動到次輪區塊，取代原本的分頁切換設計，對手機使用者更直覺）。
- 選中餐廳後提供 Google 導航連結（免另外呼叫 API，純組字串）。
- 回頭使用者會被詢問「避開前次餐廳」或「回饋前次滿意度」，寫入 `localStorage`。
- LLM 回覆為**結構化輸出**（`opening` 開場同理心語句＋每間餐廳各自的 `reason`），不再是一整段文字：
  - 開場語句獨立用斜體襯線字呈現，跟餐廳卡片視覺區隔。
  - 各餐廳的推薦理由直接放進該餐廳的卡片內。
- 餐廳卡片顯示：商家照片（見下）、名稱、距離、主要餐點類別（`primaryTypeDisplayName`）、價位（＄符號數量）、地址、推薦理由、選擇/導航按鈕。
- **商家照片代理路由**（`/api/photo`）：Google 照片網址需要帶 API 金鑰才能存取，不能直接讓前端 `<img>` 打 Google 網址（會外洩金鑰）。做法是後端自己多開一條路由，前端只拿到自家網址（如 `/api/photo?name=...`），實際跟 Google 要圖、帶金鑰的動作在後端完成，並驗證 `name` 參數格式避免被亂打參數濫用。
- 已修正深色模式造成「白字白底看不到」的 CSS bug（`globals.css` 移除跟隨系統深色模式的邏輯，加上 `color-scheme: light` 讓瀏覽器原生表單元件也強制淺色呈現）。
- 推薦結果新增硬性距離上限，避免 Google Places `locationBias` 只是軟性偏好、偶爾回傳超遠結果的問題。依交通工具誤差容忍度分三段倍數：輸入距離 ≤2km 時上限為輸入值 ×1.2、2–5km 時 ×1.5、>5km 時 ×2，且不隨放寬動作或次輪選擇而放大（距離上限代表交通工具可達範圍，是物理限制，不是預期管理問題）。
- Places API 加上 `rankPreference: "DISTANCE"` 排序參數：實測發現 locationBias 對現行多關鍵字組合查詢字串幾乎完全失效，改善明顯（郊區2km情境從約1成候選落在合法範圍內提升到接近100%）；同時發現極短距離（<1km）是 Places API 結構性限制、排序參數救不了，因此距離滑桿下限從 0.5km 調整為 1km。已用 Playwright 跑真實端對端測試驗證。
- **Vercel 正式環境端對端測試**（2026-07-08）：直接呼叫正式網址的 `/`、`/api/recommend`（round 1、round 2）、`/api/recommend/widen`、`/api/photo` 皆驗證通過，確認金鑰在正式環境生效、距離硬上限與保底救援行為正常；素食硬性過濾（`servesVegetarianFood`）、拒絕定位權限畫面、換一批/放寬搜尋的自動捲動體驗已於手機實機測試驗證通過。

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
  - 海鮮過敏、堅果過敏：關鍵字避開對應常見料理類別，**僅為盡力避開，非保證安全**，正式版 UI 已加免責聲明文字（勾選時彈窗，見「使用體驗優化」）。
- `spicyLevel`（軟性）：0=不辣 / 1=小辣 / 2=中辣 / 3=大辣。


## 未完成事項 (Incomplete)
- 目前沒有已知的待辦技術項目
