# Meeting Bot

Discord 會議管理機器人，整合 Google Calendar API，提供會議排程、場地預約、自動提醒與布告欄更新等功能。

---

## 功能概覽

### 會議管理

| 指令 | 說明 |
|------|------|
| `/add-meeting` | 新增會議，支援線上/線下、衝突偵測、自動同步日曆 |
| `/list-meetings` | 列出今日/本週/本月會議 |
| `/edit-meeting` | 編輯既有會議資訊 |
| `/cancel-meeting` | 取消會議並通知所有參加者 |
| `/user-meetings` | 查詢指定用戶的所有會議 |

### 場地租借（TRB 工作室）

| 指令 | 說明 |
|------|------|
| `/rent-venue` | 登記 TRB 工作室場地租借 |
| `/edit-rental` | 編輯租借紀錄 |
| `/cancel-rental` | 取消場地租借 |
| `/list-rentals` | 查看場地租借清單 |

### 自動化功能

- **會議布告欄**：每日 00:00 自動更新今日與本週會議
- **場地佔用布告欄**：即時顯示 TRB 工作室的使用狀況（本週 + 下週）
- **會議提醒**：前一天 20:00 及會議前 2 小時自動發送 DM
- **日曆同步**：每 10 分鐘從 Google Calendar 同步最新資料
- **衝突偵測**：新增/編輯會議時自動檢查時間衝突與場地衝突

---

## 技術棧

- **Runtime**: Node.js v18+（ES Modules）
- **Discord**: discord.js v14
- **Google API**: googleapis、google-auth-library
- **排程**: node-cron
- **日期處理**: dayjs
- **測試**: Jest
- **部署**: Zeabur

---

## 快速開始

### 前置需求

- Node.js v18 以上
- Discord Bot Token（[Discord Developer Portal](https://discord.com/developers/applications)）
- Google Calendar API 憑證（Service Account 或 OAuth 2.0）

### 安裝

```bash
git clone <repo-url>
cd meeting-bot
npm install
```

### 環境變數設定

複製範例檔案並填入設定：

```bash
cp .env.example .env
```

編輯 `.env`：

```env
# Discord Bot
DISCORD_TOKEN=你的Discord Bot Token
DISCORD_CLIENT_ID=Discord應用程式ID
GUILD_ID=Discord伺服器ID
BOARD_CHANNEL_ID=會議布告欄頻道ID
VENUE_BOARD_CHANNEL_ID=場地佔用布告欄頻道ID

# 身份組權限（可選，留空表示不限制）
ALLOWED_ROLE_IDS=身份組ID1,身份組ID2

# Google API - 選擇其中一種認證方式
GOOGLE_AUTH_TYPE=service_account   # 或 oauth

# Service Account（推薦，適合伺服器部署）
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
# 或使用 Base64 JSON（適合雲端環境變數）
# GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded-json>

# OAuth 2.0（需定期更新 refresh token）
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REFRESH_TOKEN=

# 共用設定
GOOGLE_CALENDAR_ID=你的Google日曆ID
TIMEZONE=Asia/Taipei
NODE_ENV=development
```

### 啟動

```bash
# 開發模式（自動重啟）
npm run dev

# 生產模式
npm start
```

---

## Google API 設定

### 方式一：Service Account（推薦）

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案 → 啟用 **Google Calendar API**
3. 建立 **Service Account** → 下載 JSON 金鑰
4. 將 JSON 檔案放到專案根目錄，命名為 `service-account.json`
5. 在 Google Calendar 設定中，將 Service Account Email 加入日曆共用（給予「管理活動」權限）
6. 設定 `GOOGLE_AUTH_TYPE=service_account`

驗證設定是否正確：

```bash
npm run verify-sa
```

### 方式二：OAuth 2.0

1. 在 Google Cloud Console 建立 OAuth 2.0 憑證
2. 執行以下指令取得 Refresh Token：

```bash
npm run get-token
```

3. 將產生的 Refresh Token 填入 `.env`
4. 設定 `GOOGLE_AUTH_TYPE=oauth`

---

## 布告欄頻道設定

在 Discord 伺服器中建立兩個唯讀頻道，並將頻道 ID 填入 `.env`：

| 環境變數 | 說明 |
|---------|------|
| `BOARD_CHANNEL_ID` | 會議布告欄（今日 + 本週會議） |
| `VENUE_BOARD_CHANNEL_ID` | TRB 工作室場地佔用布告欄 |

頻道權限建議：僅 Bot 可傳送訊息，成員僅可閱讀。

---

## 會議資料格式

所有資料以 Google Calendar 事件儲存，Description 欄位採結構化格式：

```
=== 會議內容 ===
1. 議程項目一
2. 議程項目二

=== 參加者 ===
@玩骰子的貓 @Loya @亞瑟

=== Discord 資訊 (JSON) ===
{
  "guild_id": "...",
  "channel_id": "...",
  "creator_id": "...",
  "meeting_type": "線上會議",
  "participants": [
    { "name": "玩骰子的貓", "user_id": "123456" }
  ]
}
```

> 在地點欄位輸入含 `TRB` 或 `工作室` 關鍵字時，Bot 會自動同步至場地佔用布告欄。

---

## 開發

### 測試

```bash
# 執行所有測試
npm test

# 監看模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage
```

### 專案結構

```
src/
├── index.js              # 進入點，載入指令與事件
├── config/
│   ├── env.js            # 環境變數載入與驗證
│   └── constants.js      # 應用程式常數
├── commands/             # Discord 斜線指令
├── services/
│   ├── calendar.js       # Google Calendar API 封裝
│   └── parser.js         # 日期時間解析器
├── jobs/
│   ├── scheduler.js      # 定時任務調度器
│   ├── update-board.js   # 布告欄更新任務
│   └── send-reminders.js # 提醒發送任務
├── utils/
│   ├── embed-builder.js  # Discord Embed 建構器
│   ├── validator.js      # 資料驗證器
│   ├── board-manager.js  # 布告欄訊息管理
│   └── date-utils.js     # 日期工具函式
└── events/
    ├── ready.js           # Bot 就緒事件
    └── interactionCreate.js # 互動事件路由
```

### 定時任務排程

| 排程 | 任務 |
|------|------|
| 每日 00:00 | 更新會議布告欄 |
| 每日 00:00 | 更新場地佔用布告欄 |
| 每 10 分鐘 | 從 Google Calendar 同步資料 |
| 每 10 分鐘 | 檢查並發送會議提醒 |

---

## 部署（Zeabur）

1. 將程式碼推送至 GitHub
2. 在 Zeabur 建立新服務並連結 GitHub 儲存庫
3. 在 Zeabur 環境變數設定頁面填入所有 `.env` 內容
4. 若使用 Service Account，建議將 JSON 內容 Base64 編碼後設定至 `GOOGLE_SERVICE_ACCOUNT_JSON`

```bash
# 產生 Base64 編碼
base64 -i service-account.json | tr -d '\n'
```

---

## 注意事項

- **時區**：統一使用 `Asia/Taipei`，請確保 Google Calendar 日曆的時區設定一致
- **無 Discord 帳號的參加者**：在名稱後標註 `(無DC)`，系統不會發送提醒給該用戶
- **API 配額**：Google Calendar 免費版每日 1,000,000 次請求，正常使用無需擔心
- **Bot 權限**：需要 `Send Messages`、`Embed Links`、`Read Message History`、`Mention Everyone`（用於提醒）及 `Send Messages in Threads`

---

## 常見問題

**Q: 布告欄沒有自動更新？**
確認 `BOARD_CHANNEL_ID` 和 `VENUE_BOARD_CHANNEL_ID` 正確，且 Bot 在該頻道有傳送訊息的權限。

**Q: 會議建立成功但日曆沒有事件？**
使用 `npm run verify-sa` 或 `npm run test-calendar` 確認 Google API 憑證設定正確。

**Q: 提醒沒有發送？**
確認 Bot 有對目標用戶發送 DM 的權限（用戶需開放「允許來自伺服器成員的私訊」）。

**Q: 如何限制只有特定身份組可使用指令？**
在 `.env` 設定 `ALLOWED_ROLE_IDS`，填入允許使用的身份組 ID，多個 ID 以逗號分隔。
