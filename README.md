# Meeting Bot

<p align="center">
  <strong>Discord 會議與 TRB 工作室場地管理機器人</strong><br>
  整合 Google Calendar，提供會議排程、場地租借、衝突偵測、自動提醒與布告欄更新。
</p>

<p align="center">
  <a href="https://github.com/Warmlatte/Meeting_Bot/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Warmlatte/Meeting_Bot/ci.yml?branch=main&label=CI&logo=github"></a>
  <a href="https://nodejs.org/"><img alt="Node.js 18+" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white"></a>
  <a href="https://discord.js.org/"><img alt="discord.js v14" src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white"></a>
  <img alt="Google Calendar" src="https://img.shields.io/badge/Google%20Calendar-API-4285F4?logo=googlecalendar&logoColor=white">
  <img alt="Jest" src="https://img.shields.io/badge/Tested%20with-Jest-C21325?logo=jest&logoColor=white">
  <img alt="License ISC" src="https://img.shields.io/badge/License-ISC-blue">
  <img alt="Deploy Zeabur" src="https://img.shields.io/badge/Deploy-Zeabur-7B61FF">
</p>

## 功能特色

- Discord slash commands 管理會議與 TRB 工作室租借。
- 會議資料同步儲存在 Google Calendar，方便跨平台查看與維護。
- 支援線上 / 線下會議、參加者、議程、地點與時間設定。
- 新增或編輯會議時自動檢查時間衝突與場地衝突。
- 每日更新會議布告欄與 TRB 工作室場地佔用布告欄。
- 每 10 分鐘檢查提醒，支援前一天與會議前提醒。
- 可用 Service Account 或 OAuth 2.0 連接 Google Calendar API。
- 支援身份組白名單，限制特定 Discord role 才能使用指令。
- 內建 Jest 測試、coverage 與 GitHub Actions CI。
- 適合部署到 Zeabur，支援雲端環境變數保存 Google 憑證。

## 使用流程

1. 管理者設定 Discord Bot、Google Calendar 與布告欄頻道。
2. 成員透過 `/add-meeting` 或 `/rent-venue` 建立會議 / 租借。
3. Bot 寫入 Google Calendar，並檢查是否與既有時段衝突。
4. Bot 更新 Discord 會議布告欄與場地佔用布告欄。
5. 定時任務在會議前自動發送 Discord DM 提醒。
6. 成員可使用查詢、編輯與取消指令維護日程。

## Slash Commands

### 會議管理

| 指令 | 說明 |
| --- | --- |
| `/add-meeting` | 新增會議，支援線上 / 線下、衝突偵測與 Google Calendar 同步 |
| `/list-meetings` | 列出今日、本週或本月會議 |
| `/edit-meeting` | 編輯既有會議資訊 |
| `/cancel-meeting` | 取消會議並通知參加者 |
| `/user-meetings` | 查詢指定用戶的所有會議 |

### 場地租借

| 指令 | 說明 |
| --- | --- |
| `/rent-venue` | 登記 TRB 工作室場地租借 |
| `/list-rentals` | 查看場地租借清單 |
| `/edit-rental` | 編輯租借紀錄 |
| `/cancel-rental` | 取消場地租借 |

### 維護與測試

| 指令 | 說明 |
| --- | --- |
| `/update-board` | 手動更新會議 / 場地布告欄 |
| `/test-reminder` | 測試提醒發送流程 |

## 自動化排程

| 排程 | 任務 |
| --- | --- |
| Bot 啟動後約 5 秒 | 初始更新布告欄 |
| 每日 00:00 | 更新會議布告欄與場地佔用布告欄 |
| 每 10 分鐘 | 檢查並發送會議提醒 |

## 環境變數

複製 `.env.example` 後填入設定：

```bash
cp .env.example .env
```

```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
BOARD_CHANNEL_ID=your_board_channel_id_here
VENUE_BOARD_CHANNEL_ID=your_venue_board_channel_id_here
ALLOWED_ROLE_IDS=

# Google API
GOOGLE_AUTH_TYPE=service_account
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_CALENDAR_ID=your_google_calendar_id_here

# OAuth 2.0 only
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Runtime
NODE_ENV=development
TIMEZONE=Asia/Taipei
```

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `DISCORD_TOKEN` | 是 | Discord bot token |
| `DISCORD_CLIENT_ID` | 是 | Discord application client ID |
| `GUILD_ID` | 是 | 目標 Discord server ID |
| `BOARD_CHANNEL_ID` | 建議 | 會議布告欄頻道 ID |
| `VENUE_BOARD_CHANNEL_ID` | 建議 | TRB 工作室場地佔用布告欄頻道 ID |
| `ALLOWED_ROLE_IDS` | 否 | 允許使用 Bot 的 role ID，多個以逗號分隔；留空不限制 |
| `GOOGLE_AUTH_TYPE` | 是 | `service_account` 或 `oauth` |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Service Account 本機模式 | service account JSON 檔案路徑 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service Account 雲端模式 | Base64 編碼的 service account JSON |
| `GOOGLE_CALENDAR_ID` | 是 | Google Calendar ID |
| `GOOGLE_CLIENT_ID` | OAuth 模式 | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 模式 | OAuth 2.0 client secret |
| `GOOGLE_REFRESH_TOKEN` | OAuth 模式 | OAuth 2.0 refresh token |
| `TIMEZONE` | 否 | 預設 `Asia/Taipei` |

## 快速開始

```bash
git clone https://github.com/Warmlatte/Meeting_Bot.git
cd Meeting_Bot
npm install
cp .env.example .env
npm run dev
```

生產模式：

```bash
npm start
```

## Google Calendar 設定

### Service Account（推薦）

1. 前往 Google Cloud Console 建立專案。
2. 啟用 Google Calendar API。
3. 建立 Service Account 並下載 JSON 金鑰。
4. 本機開發可將金鑰命名為 `service-account.json`，並設定 `GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json`。
5. 雲端部署可將 JSON 轉為 Base64 後放入 `GOOGLE_SERVICE_ACCOUNT_JSON`。
6. 在 Google Calendar 設定中，將 service account email 加入日曆共用，並授予管理活動權限。
7. 執行驗證：

```bash
npm run verify-sa
```

### OAuth 2.0

1. 在 Google Cloud Console 建立 OAuth 2.0 憑證。
2. 執行 token 產生流程：

```bash
npm run get-token
```

3. 將 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN` 與 `GOOGLE_CALENDAR_ID` 寫入 `.env`。
4. 設定 `GOOGLE_AUTH_TYPE=oauth`。

## 布告欄頻道

建議在 Discord 伺服器建立兩個唯讀頻道：

| 頻道 | 環境變數 | 用途 |
| --- | --- | --- |
| 會議布告欄 | `BOARD_CHANNEL_ID` | 顯示今日與本週會議 |
| 場地佔用布告欄 | `VENUE_BOARD_CHANNEL_ID` | 顯示 TRB 工作室本週與下週使用狀況 |

頻道權限建議設為成員可閱讀、僅 Bot 可傳送訊息。

## 會議資料格式

會議與租借資料會儲存在 Google Calendar event 中。Description 欄位使用結構化文字保存議程、參加者與 Discord metadata：

```text
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

地點欄位包含 `TRB` 或 `工作室` 時，Bot 會把事件納入 TRB 工作室場地佔用布告欄。

## 開發指令

```bash
npm run dev            # 開發模式，使用 nodemon
npm start              # 生產模式
npm test               # 執行 Jest 測試
npm run test:watch     # Jest watch mode
npm run test:coverage  # 產生覆蓋率報告
npm run test-calendar  # 測試 Google Calendar 連線
npm run verify-sa      # 驗證 Service Account 設定
```

## 專案結構

```text
src/
  commands/      Discord slash commands
  config/        環境變數與應用程式常數
  events/        Discord client events
  jobs/          node-cron 定時任務
  services/      Google Calendar 與日期解析服務
  utils/         Embed、布告欄、提醒與驗證工具
scripts/         Google token 與 API 驗證腳本
tests/           unit / integration tests
docs/            分階段開發文件
```

## 部署到 Zeabur

1. 將 repo 連接到 Zeabur。
2. 在 Zeabur 環境變數頁面填入 `.env` 所需設定。
3. Service Account 建議使用 `GOOGLE_SERVICE_ACCOUNT_JSON`：

```bash
base64 -i service-account.json | tr -d '\n'
```

4. 推送到 `main` 後，GitHub Actions 會先跑測試；Zeabur 可透過 GitHub integration 或 deploy hook 部署。

## 注意事項

- 時區預設為 `Asia/Taipei`，Google Calendar 的日曆時區也建議保持一致。
- 無 Discord 帳號的參加者可在名稱後標註 `(無DC)`，Bot 不會對該參加者發送 DM。
- Bot 需要 Discord 權限：`Send Messages`、`Embed Links`、`Read Message History`、`Mention Everyone` 與 thread message 權限。
- 使用 Service Account 時，請確認日曆已分享給 service account email。
- Google Calendar API 免費配額對一般會議管理用途通常足夠。

## 常見問題

**Q: 布告欄沒有更新？**  
確認 `BOARD_CHANNEL_ID`、`VENUE_BOARD_CHANNEL_ID` 正確，且 Bot 在頻道中有傳送訊息與嵌入連結權限。

**Q: 會議建立成功但 Google Calendar 沒有事件？**  
先執行 `npm run verify-sa` 或 `npm run test-calendar`，確認 Google API 憑證、Calendar ID 與共用權限。

**Q: 提醒沒有送出？**  
確認使用者允許來自伺服器成員的私訊，並確認事件中有可對應的 Discord user ID。

**Q: 如何限制只有特定身份組可使用指令？**  
在 `ALLOWED_ROLE_IDS` 填入允許使用的 role ID，多個 ID 以逗號分隔。

## License

ISC. See `package.json`.
