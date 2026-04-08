# 借用車輛委託書電子簽署 HTML 系統

這是一套單用途的車主委託放租系統，已收斂成「普通合約簽署頁」：

1. 開啟首頁會直接進入合約簽署流程
2. 車主透過 HTML 簽署頁填資料
3. 勾選同意事項
4. 取得連線來源 / 定位資訊 / OTP / 親簽
5. 簽署完成後由 server 端生成最終 PDF
6. PDF 與所有佐證資料封存，不覆蓋原始版本

## Render 部署

這個專案可以直接部署到 Render 的 Node Web Service，並搭配 Render Postgres。

建議設定：

- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Root Directory: 留空
- Branch: 你的 GitHub 主分支

### Database

本專案現在使用 PostgreSQL，不再依賴 SQLite 檔案。

如果你用本 repo 的 `render.yaml`，Render 會自動建立：

- 一個 Web Service
- 一個 PostgreSQL Database
- `DATABASE_URL` 會由 `fromDatabase` 自動注入

### 檔案儲存

free Blueprint 版本會使用 Render 容器內的暫存目錄保存上傳檔案與最終 PDF：

- 檔案儲存目錄: `/tmp/loan-test-storage`

如果你升級成付費 Web Service，再把這個目錄改成 persistent disk 掛載點即可。

### 環境變數

部署時請確認：

- `APP_URL=https://你的-render-網址`
- `DATABASE_URL` 由 Render Postgres 自動注入
- `STORAGE_DIR=/tmp/loan-test-storage`
- `APP_SESSION_SECRET`：由 Render 產生或手動設定，請至少 32 字元。
- `OTP_MOCK_ENABLED=true`
- `OTP_DEFAULT_CODE=123456`

如果你正式上線，不要再用 mock OTP，改成你自己的簡訊服務。

## 技術棧

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- `pdf-lib` server-side PDF 生成
- `signature_pad` HTML 親簽
- `zod` 驗證
- 本地檔案儲存

## 專案結構

- `app/`：頁面與 API routes
- `components/`：UI 與簽署元件
- `lib/`：商業邏輯、驗證、PDF、儲存
- `prisma/schema.prisma`：資料模型
- `prisma/seed.ts`：示範案件

## 安裝

```bash
npm install
```

## 環境變數

複製 `.env.example` 為 `.env`，並調整：

- `DATABASE_URL`
- `APP_URL`
- `APP_SESSION_SECRET`（至少 32 字元）
- `OTP_MOCK_ENABLED`
- `OTP_DEFAULT_CODE`
- `STORAGE_DIR`

## Migration

```bash
npx prisma db push
```

## Seed

```bash
npx prisma db seed
```

Seed 會建立：

- 一筆示範車主委託放租案件

## 啟動

```bash
npm run dev
```

## OTP Mock

系統內建 mock OTP：

- `OTP_MOCK_ENABLED=true` 時，API 會回傳 mock code 供測試
- `OTP_DEFAULT_CODE` 可固定測試碼

未來要串真簡訊，只要把 `sendOtp` 的實作換掉即可。

## HTML 簽署流程

簽署流程如下：

1. 開啟首頁
2. 填寫車主基本資料
3. 閱讀完整契約全文
4. 勾選所有同意項目
5. 送出定位佐證
6. 發送並驗證 OTP
7. 在 HTML Signature Pad 親簽
8. 最終確認後完成簽署
9. 由 server 端生成最終 PDF

## PDF 生成時機

PDF 不會在建立案件時產生。

只有在 `/api/sign/:token/complete` 完成以下條件後才會生成：

- profile 已完成
- consents 已完成
- OTP 已驗證
- signature 已存在

## 定位測試方式

- 在瀏覽器允許定位權限時，系統會記錄定位資訊與捕捉時間
- 若拒絕或失敗，系統仍會記錄定位狀態與錯誤訊息
- 定位只是輔助證據，不會阻止簽署流程


## Telegram PDF 傳送
- 設定 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID` 後，完成簽署時系統會自動把最終 PDF 傳送到指定 Telegram。
- 也可使用 `TG_TOKEN` / `TG_ID` 或 `TELEGRAM_TOKEN` / `TELEGRAM_ID`，程式會自動兼容。

## Telegram 傳送 PDF 用
- `TELEGRAM_BOT_TOKEN`：Telegram Bot Token（也可用 `TG_TOKEN` 或 `TELEGRAM_TOKEN`）
- `TELEGRAM_CHAT_ID`：接收 PDF 的聊天 ID（也可用 `TG_ID` 或 `TELEGRAM_ID`）
- 完成簽署後，系統會自動嘗試把最終 PDF 傳送到 Telegram。
- 測試 Telegram 可用 POST /api/debug/telegram-test，會把最近一筆已封存 PDF 再送一次。





