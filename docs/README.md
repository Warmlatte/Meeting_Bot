# Meeting Bot 開發文件總覽

> **專案**: Discord 會議管理機器人
> **版本**: 1.0.0
> **最後更新**: 2025-11-02

此目錄包含 Meeting Bot 的完整開發文件,涵蓋所有功能的實作指引。

---

## 📚 文件結構

```
docs/
├── README.md                          # 本文件 - 開發文件總覽
├── phase1/                            # Phase 1: 基礎功能 (MVP)
│   ├── 01-discord-bot-setup.md        # Discord Bot 基本設定
│   ├── 02-google-calendar-api.md      # Google Calendar API 串接
│   ├── 03-add-meeting-command.md      # /add-meeting 指令實作
│   ├── 04-list-meetings-command.md    # /list-meetings 指令實作
│   └── 05-basic-reminders.md          # 基本提醒功能
└── phase2/                            # Phase 2: 完善功能
    ├── 01-meeting-board.md            # 會議布告欄自動更新
    ├── 02-multi-reminders.md          # 多時段提醒
    └── 03-edit-cancel-meeting.md      # 編輯/取消會議功能
```

---

## 🚀 開發流程

### Phase 1: 基礎功能 (MVP)

完成 Phase 1 後,Bot 將具備核心會議管理功能,可以投入基本使用。

#### 1.1 Discord Bot 基本設定
- **文件**: [01-discord-bot-setup.md](./phase1/01-discord-bot-setup.md)
- **預估時間**: 2-3 小時
- **依賴**: 無
- **產出**:
  - ✅ Node.js 專案初始化
  - ✅ Discord Bot 建立與連線
  - ✅ 事件處理系統
  - ✅ 環境變數管理

#### 1.2 Google Calendar API 串接
- **文件**: [02-google-calendar-api.md](./phase1/02-google-calendar-api.md)
- **預估時間**: 3-4 小時
- **依賴**: P1-01
- **產出**:
  - ✅ OAuth 2.0 認證設定
  - ✅ CalendarService 服務類別
  - ✅ CRUD 操作實作
  - ✅ 資料格式化與解析

#### 1.3 /add-meeting 指令實作
- **文件**: [03-add-meeting-command.md](./phase1/03-add-meeting-command.md)
- **預估時間**: 4-5 小時
- **依賴**: P1-01, P1-02
- **產出**:
  - ✅ 互動式表單 (Select Menu + Modal)
  - ✅ 資料驗證器
  - ✅ 時間衝突檢查
  - ✅ 會議建立功能

#### 1.4 /list-meetings 指令實作
- **文件**: [04-list-meetings-command.md](./phase1/04-list-meetings-command.md)
- **預估時間**: 3-4 小時
- **依賴**: P1-02
- **產出**:
  - ✅ 篩選功能 (今日/本週/本月)
  - ✅ 分頁瀏覽
  - ✅ Embed 列表顯示
  - ✅ 快速查詢

#### 1.5 基本提醒功能
- **文件**: [05-basic-reminders.md](./phase1/05-basic-reminders.md)
- **預估時間**: 3-4 小時
- **依賴**: P1-02
- **產出**:
  - ✅ 會議前 2 小時提醒
  - ✅ DM 私訊提醒
  - ✅ node-cron 定時任務
  - ✅ 提醒訊息格式

**Phase 1 總計**: 15-20 小時

---

### Phase 2: 完善功能

Phase 2 增強使用者體驗,提供更完整的會議管理功能。

#### 2.1 會議布告欄自動更新
- **文件**: [01-meeting-board.md](./phase2/01-meeting-board.md)
- **預估時間**: 4-5 小時
- **依賴**: P1-02
- **產出**:
  - ✅ 今日會議看板
  - ✅ 本週會議看板
  - ✅ 自動更新機制 (每日 00:00)
  - ✅ 即時更新 (會議新增/修改時)

#### 2.2 多時段提醒
- **文件**: [02-multi-reminders.md](./phase2/02-multi-reminders.md)
- **預估時間**: 2-3 小時
- **依賴**: P1-05
- **產出**:
  - ✅ 前一天 20:00 提醒
  - ✅ 會議前 2 小時提醒
  - ✅ 提醒記錄管理
  - ✅ 避免重複提醒

#### 2.3 編輯/取消會議功能
- **文件**: [03-edit-cancel-meeting.md](./phase2/03-edit-cancel-meeting.md)
- **預估時間**: 5-6 小時
- **依賴**: P1-03, P1-04
- **產出**:
  - ✅ /edit-meeting 指令
  - ✅ /cancel-meeting 指令
  - ✅ /user-meetings 指令
  - ✅ 參加者通知機制

**Phase 2 總計**: 11-14 小時

---

## 📊 開發時程總覽

| 階段 | 功能數量 | 預估時間 | 狀態 |
|------|---------|---------|------|
| **Phase 1** | 5 項功能 | 15-20 小時 | 📋 規劃中 |
| **Phase 2** | 3 項功能 | 11-14 小時 | 📋 規劃中 |
| **總計** | 8 項功能 | **26-34 小時** | 📋 規劃中 |

> **建議**: 以 Phase 為單位進行開發,每完成一個 Phase 後進行完整測試再進入下一 Phase。

---

## 🎯 快速導航

### 依功能類型查找

#### 🤖 Discord Bot 相關
- [Discord Bot 基本設定](./phase1/01-discord-bot-setup.md)
- [/add-meeting 指令](./phase1/03-add-meeting-command.md)
- [/list-meetings 指令](./phase1/04-list-meetings-command.md)
- [編輯/取消會議](./phase2/03-edit-cancel-meeting.md)

#### 📅 Google Calendar 相關
- [Google Calendar API 串接](./phase1/02-google-calendar-api.md)
- [資料格式化與解析](./phase1/02-google-calendar-api.md#資料格式)

#### 🔔 提醒系統相關
- [基本提醒功能](./phase1/05-basic-reminders.md)
- [多時段提醒](./phase2/02-multi-reminders.md)

#### 📊 資料展示相關
- [會議列表展示](./phase1/04-list-meetings-command.md)
- [會議布告欄](./phase2/01-meeting-board.md)

---

## 📝 使用指引

### 開始開發前

1. **閱讀 CLAUDE.md**
   - 了解專案架構與規範
   - 熟悉關鍵規則與工作流程
   - 確認環境變數設定

2. **準備開發環境**
   - 安裝 Node.js v18+
   - 準備 Discord Bot Token
   - 準備 Google Calendar API 憑證

3. **選擇開發階段**
   - 建議從 Phase 1 開始依序完成
   - 每個功能都有明確的依賴關係

### 開發流程

1. **閱讀功能文件**
   - 了解功能概述與目標
   - 確認依賴項目已完成
   - 檢查所需套件

2. **按步驟實作**
   - 依照文件中的實作步驟進行
   - 複製程式碼範例並根據需求調整
   - 注意錯誤處理與驗證

3. **測試與驗證**
   - 使用文件中的測試檢查清單
   - 執行所有測試案例
   - 確認功能正常運作

4. **提交變更**
   - 完成實作檢查清單
   - 提交到 git
   - 推送到 GitHub 備份

### 遇到問題時

1. **查看常見問題排解**
   - 每個文件都包含常見問題章節
   - 參考錯誤訊息與解決方案

2. **參考相關文件**
   - 檢查相關文件連結
   - 閱讀官方文檔

3. **檢查 CLAUDE.md**
   - 確認是否遵守專案規範
   - 檢查技術債務預防流程

---

## 🔧 技術棧速查

### 核心技術

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | v18+ | 執行環境 |
| discord.js | ^14.14.1 | Discord Bot 框架 |
| googleapis | ^128.0.0 | Google Calendar API |
| google-auth-library | ^9.0.0 | Google OAuth 認證 |
| dayjs | ^1.11.10 | 日期時間處理 |
| node-cron | ^3.0.3 | 定時任務 |
| dotenv | ^16.3.1 | 環境變數管理 |

### 開發工具

| 工具 | 用途 |
|------|------|
| nodemon | 開發時自動重啟 |
| jest | 單元測試 (選用) |

---

## 📖 文檔慣例

### 文件格式說明

每個開發文件都遵循以下格式:

1. **標題區塊**
   - 功能編號、名稱
   - 預估時間、依賴項目、完成標準

2. **功能概述**
   - 功能說明
   - 實作目標清單

3. **技術資訊**
   - 所需套件
   - 檔案結構
   - 環境變數

4. **實作步驟**
   - Step-by-step 指引
   - 完整程式碼範例
   - 註解說明

5. **測試與驗證**
   - 測試檢查清單
   - 測試程式碼範例
   - 常見問題排解

6. **檢查清單**
   - 實作檢查清單
   - Git 提交指引

7. **相關資源**
   - 相關文件連結
   - 官方文檔連結
   - 下一步指引

### 程式碼慣例

- **語言**: JavaScript (ES6+)
- **模組系統**: CommonJS (require/module.exports)
- **命名**:
  - 檔案: kebab-case (例: `add-meeting.js`)
  - 類別: PascalCase (例: `CalendarService`)
  - 函式/變數: camelCase (例: `createMeeting`)
  - 常數: UPPER_SNAKE_CASE (例: `MEETING_TYPES`)

---

## ✅ 開發檢查清單

### 開始開發前
- [ ] 已閱讀 CLAUDE.md
- [ ] 已準備開發環境
- [ ] 已取得必要的 API 憑證
- [ ] 已了解專案架構

### 開發過程中
- [ ] 遵守 CLAUDE.md 規範
- [ ] 先搜尋再建立新檔案
- [ ] 使用 TodoWrite 追蹤進度
- [ ] 適當的錯誤處理
- [ ] 無硬編碼敏感資訊

### 完成功能後
- [ ] 通過所有測試檢查
- [ ] 程式碼品質良好
- [ ] 提交到 git
- [ ] 推送到 GitHub
- [ ] 更新文件 (如有必要)

---

## 🚀 開始開發

準備好開始了嗎?

1. **從 Phase 1.1 開始**: [Discord Bot 基本設定](./phase1/01-discord-bot-setup.md)
2. **或查看完整流程**: [開發流程](#開發流程)
3. **需要幫助?**: 查看 [CLAUDE.md](../CLAUDE.md) 的常見問題章節

---

## 📞 支援與回饋

- **專案文件**: [CLAUDE.md](../CLAUDE.md)
- **技術問題**: 參考各功能文件的「常見問題排解」章節
- **Discord.js 文檔**: https://discord.js.org/
- **Google Calendar API**: https://developers.google.com/calendar

---

**祝開發順利! 🎉**
