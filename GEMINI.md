# 🏛️ visforthearts (VIS Contemporary Culture 2027) 專案專屬開發規範與規格書

本規範自動套用於 `visforthearts` 專案目錄。AI 在修改本專案任何檔案時，必須同時遵守根目錄全局規範與本專案專屬規範。

---

## 1. 🔒 全站凍結保護區清單（未經點名嚴禁觸碰）

本專案包含四大獨立運作的前後台生態系與 25+ 支 API。除非使用者在對話中**明確點名**要修改該特定頁面或功能，否則以下所有模組均處於**「凍結保護狀態」**，AI 嚴禁順手修改、重構或更動資料庫欄位：

1. **展覽前台、售票與徵件系統**：
   - 主視覺首頁：`src/app/page.tsx`、`src/app/v2/page.tsx`
   - 觀眾購票／登記與品牌配額領票：`src/app/ticket/page.tsx` 及 `/api/tickets/*`
   - Making Project 工藝徵件報名（NT\$12,000）：`src/app/making-project/page.tsx`
2. **Exhibitor 參展商全流程系統（高風險鎖定）**：
   - 參展商報名與展位選擇（Artsy / Premier / Atelier 等展區與 NT\$20,000 訂金）：`src/app/exhibitor/apply/page.tsx`、`src/lib/exhibitorConstants.ts`
   - 參展商登入與密碼重設：`src/app/exhibitor/page.tsx`、`src/app/exhibitor/reset-password/page.tsx`
   - 參展商專屬後台（`/exhibitor/portal/*`）：主控台、客戶邀請票配額 (`tickets`)、VIP 藏家提名 (`vip`)、展品登錄與桌卡 QR 產生器 (`products`)、現場掃描名單 CRM (`leads`)、合約合規簽署 (`compliance`)、媒體公關素材上傳 (`media`)、中英雙語切換 (`ExhibitorLanguageContext.tsx`)
   - 主辦方參展商總管理後台：`src/app/exhibitor/admin/page.tsx` 及 `/api/exhibitor/*`
3. **VIP 藏家與盲盒互動系統（高風險鎖定）**：
   - VIP 申請、Magic Link 登入與身份引導：`/vip`、`/vip/apply`、`/vip/onboarding`
   - VIP 專屬通行證與收藏夾：`/vip/dashboard`、`/vip/product/[id]`
   - 盲盒抽獎與現場核銷兌換：`/vip/blind-box`、`/vip/blind-box/redeem`
   - 星座藝術語錄分享卡：`/vip/story`
   - VIP 審核後台與現場接待處掃描器：`/vip/admin`、`/vip/scanner` 及 `/api/vip/*`
4. **Perspectives Wall 展場互動問答牆系統**：
   - 觀眾提問頁：`/question`
   - 展場大螢幕全螢幕自動輪播：`/question/display`
   - 提問審核與推播後台：`/question/admin`、`src/lib/perspectiveDb.ts`、`src/lib/perspectiveTypes.ts`

---

## 2. 🛑 防止「改 A 壞 B」：跨模組與 API 隔離鐵律

- **四大子系統嚴格隔離**：
  - 修改「前台首頁 (`/`)」時，絕對禁止連動修改到 `/exhibitor/*`、`/vip/*` 或 `/question/*`。
  - 修改「參展商後台 (`/exhibitor/portal`)」時，若涉及 `exhibitorConstants.ts`（展區價格、截止日、匯款帳號）或中英雙語字典 (`ExhibitorLanguageContext.tsx`)，AI 必須先在幕後檢查是否會影響「參展商報名頁 (`/exhibitor/apply`)」與「主辦方總後台 (`/exhibitor/admin`)」；若有連動，**必須先停下來用白話文詢問使用者**。
- **全域樣式與 Tailwind 零污染**：
  - 禁止隨意改動 `src/app/globals.css` 與 `src/app/layout.tsx` 的基底設定（如全域背景色 `bg-[#f5f5f5]`、字體變數或 shadcn 主題色），以免造成全站多達 20 幾個子頁面集體變色或字體跳掉。
- **API 與 Supabase 資料表向下相容**：
  - 本專案前台、Portal 與 Admin 後台高度依賴共用資料表。嚴禁刪除或改名既有 API 回傳欄位與資料庫欄位，以免導致 QR Code 掃描器、名單匯出或後台審核白畫面。

---

## 3. 🎨 品牌美學與視覺一致性規範 (VIS Contemporary Culture)

當新增區塊或調整畫面時，**嚴禁 AI 自創突兀樣式**，必須根據所在子系統對標既有頁面：

- **視覺基底與色調**：
  - 展會主調為極簡當代文化質感：淺灰畫布基底 (`#f5f5f5` / 純白卡片)、高對比純黑文字與邊框、克制留白。
  - 襯線與無襯線混排規範：大標題與文化宣言沿用既有典雅襯線體 (`font-serif`)，表單、數據後台與導覽介面沿用乾淨的無襯線體 (`Geist Sans` / `font-sans`) 與等寬字體 (`Geist Mono` 用於票號、金額、QR 代碼)。
- **視覺改動雙軌制**：
  - **日常修改／新增小區塊（對標現有頁面＋禁用自創樣式）**：
    - 改前台頁 ➔ 對標 `src/app/page.tsx` 或 `/ticket` 的字級、留白與按鈕樣式。
    - 改參展商後台 ➔ 100% 對標 `/exhibitor/portal` 內現有分頁的卡片、表格與按鈕設計，並確保支援中英雙語顯示。
    - 改 VIP 系統 ➔ 100% 對標 `/vip/dashboard` 的尊榮黑金／極簡卡片風格。
  - **較大畫面調整／全新版型（先出視覺草稿或方案對比再改）**：
    - 先提供視覺預覽或排版方案比較，等使用者確認喜歡後再寫入正式網站。

---

## 4. 📱 交付前自動檢查與白話驗收要求

1. **雙裝置防跑版驗證（特別注意手機端場景）**：
   - **桌面版（若有）**：檢查首頁、參展商 Portal 後台與 Admin 審核大表單在電腦螢幕上的排版完整性。
   - **手機版（若有）**：本專案有大量現場手機使用場景（觀眾領票 `/ticket`、VIP 通行證與盲盒 `/vip/*`、現場 QR 掃描器 `/vip/scanner`、展場問答牆 `/question`），每次修改後 AI 必須確認手機直式畫面不跑版、按鈕好點擊、不出現橫向破版。
2. **附帶白話驗收單**：回報時清楚列出「✅ 這次改了哪裡」、「🛡️ 確認其他凍結系統與後台未受影響、桌面與手機版正常」、「⏪ 隨時可說『還原上一步』退回」。
