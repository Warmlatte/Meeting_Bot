# Phase 1.1 - Discord Bot 基本設定

> **功能編號**: P1-01
> **功能名稱**: Discord Bot 基本設定
> **預估時間**: 2-3 小時
> **依賴項目**: 無
> **完成標準**: Bot 能成功連線並回應基本互動

---

## 📋 功能概述

建立 Discord Bot 的基礎架構,包括專案初始化、Bot 註冊、基本連線設定,以及事件處理系統。

## 🎯 實作目標

- [x] 初始化 Node.js 專案
- [x] 安裝必要的依賴套件
- [x] 設定環境變數管理
- [x] 建立 Discord Bot 並取得 Token
- [x] 實作基本的事件處理系統
- [x] 測試 Bot 連線與基本指令

---

## 📦 所需套件

```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## 🔧 環境變數設定

### `.env` 檔案

```env
# Discord Bot 設定
DISCORD_TOKEN=你的Discord Bot Token
DISCORD_CLIENT_ID=Discord應用程式ID
GUILD_ID=Discord伺服器ID (開發用)

# 環境設定
NODE_ENV=development
TIMEZONE=Asia/Taipei
```

### `.env.example` 檔案

```env
# Discord Bot 設定
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# 環境設定
NODE_ENV=development
TIMEZONE=Asia/Taipei
```

---

## 📁 檔案結構

```
src/
├── index.js                 # 主程式進入點
├── config/
│   ├── env.js              # 環境變數配置
│   └── constants.js        # 常數定義
└── events/
    ├── ready.js            # Bot 就緒事件
    └── interactionCreate.js # 互動事件處理
```

---

## 💻 實作步驟

### Step 1: 初始化專案

```bash
# 初始化 package.json
npm init -y

# 安裝依賴套件
npm install discord.js dotenv
npm install --save-dev nodemon

# 創建目錄結構
mkdir -p src/config src/events src/commands src/services src/utils src/jobs
```

### Step 2: 設定 package.json 腳本

```json
{
  "name": "meeting-bot",
  "version": "1.0.0",
  "description": "Discord 會議管理機器人",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "keywords": ["discord", "bot", "meeting", "calendar"],
  "author": "",
  "license": "ISC"
}
```

### Step 3: 建立環境變數配置 (`src/config/env.js`)

```javascript
const dotenv = require('dotenv');
const path = require('path');

// 載入 .env 檔案
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 環境變數配置
 */
const config = {
  // Discord 設定
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },

  // 環境設定
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TIMEZONE || 'Asia/Taipei',
};

/**
 * 驗證必要的環境變數
 */
function validateEnv() {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`缺少必要的環境變數: ${missing.join(', ')}`);
  }
}

// 啟動時驗證環境變數
validateEnv();

module.exports = config;
```

### Step 4: 建立常數定義 (`src/config/constants.js`)

```javascript
/**
 * 應用程式常數定義
 */
const CONSTANTS = {
  // Bot 設定
  BOT_NAME: 'Meeting Bot',
  BOT_VERSION: '1.0.0',

  // 會議類型
  MEETING_TYPES: {
    ONLINE: '線上會議',
    OFFLINE: '線下會議',
  },

  // 預設值
  DEFAULTS: {
    MEETING_DURATION: 2, // 預設會議時長(小時)
    ONLINE_LOCATION: 'DC',
  },

  // 顏色代碼 (用於 Embed)
  COLORS: {
    SUCCESS: 0x00ff00,  // 綠色
    ERROR: 0xff0000,    // 紅色
    INFO: 0x0099ff,     // 藍色
    WARNING: 0xffaa00,  // 橙色
  },
};

module.exports = CONSTANTS;
```

### Step 5: 實作 Ready 事件 (`src/events/ready.js`)

```javascript
const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot 已就緒! 登入為 ${client.user.tag}`);
    console.log(`📊 伺服器數量: ${client.guilds.cache.size}`);
    console.log(`👥 用戶數量: ${client.users.cache.size}`);

    // 設定 Bot 狀態
    client.user.setPresence({
      activities: [{ name: '會議管理中 | /help' }],
      status: 'online',
    });
  },
};
```

### Step 6: 實作互動事件處理 (`src/events/interactionCreate.js`)

```javascript
const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // 處理斜線指令
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ 找不到指令: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ 執行指令時發生錯誤:`, error);

        const errorMessage = {
          content: '執行指令時發生錯誤!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // 處理按鈕互動
    if (interaction.isButton()) {
      // 將在後續實作
      console.log(`🔘 按鈕互動: ${interaction.customId}`);
    }

    // 處理選單互動
    if (interaction.isStringSelectMenu()) {
      // 將在後續實作
      console.log(`📋 選單互動: ${interaction.customId}`);
    }

    // 處理 Modal 提交
    if (interaction.isModalSubmit()) {
      // 將在後續實作
      console.log(`📝 Modal 提交: ${interaction.customId}`);
    }
  },
};
```

### Step 7: 建立主程式 (`src/index.js`)

```javascript
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/env');

/**
 * 建立 Discord Client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

/**
 * 載入指令
 */
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

// 檢查 commands 目錄是否存在
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ 已載入指令: ${command.data.name}`);
    } else {
      console.warn(`⚠️ 指令 ${file} 缺少必要的 "data" 或 "execute" 屬性`);
    }
  }
}

/**
 * 載入事件處理器
 */
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  console.log(`✅ 已載入事件: ${event.name}`);
}

/**
 * 錯誤處理
 */
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

/**
 * 啟動 Bot
 */
client.login(config.discord.token)
  .then(() => {
    console.log('🚀 Bot 正在啟動中...');
  })
  .catch(error => {
    console.error('❌ Bot 登入失敗:', error);
    process.exit(1);
  });
```

---

## 🔐 Discord Bot 建立流程

### 1. 前往 Discord Developer Portal

訪問 https://discord.com/developers/applications

### 2. 建立新應用程式

1. 點擊 "New Application"
2. 輸入應用程式名稱 (例如: Meeting Bot)
3. 點擊 "Create"

### 3. 設定 Bot

1. 在左側選單選擇 "Bot"
2. 點擊 "Add Bot"
3. 確認建立 Bot
4. 點擊 "Reset Token" 取得 Bot Token (僅顯示一次,請妥善保存)
5. 啟用以下 Privileged Gateway Intents:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT

### 4. 設定 OAuth2

1. 在左側選單選擇 "OAuth2" > "URL Generator"
2. 選擇以下 Scopes:
   - ✅ bot
   - ✅ applications.commands
3. 選擇 Bot Permissions:
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Mention Everyone
4. 複製產生的 URL 並在瀏覽器開啟
5. 選擇要加入的伺服器
6. 授權 Bot

### 5. 取得 Client ID 和 Guild ID

- **Client ID**: 在 "General Information" 頁面
- **Guild ID**: 在 Discord 中啟用開發者模式 (設定 > 進階 > 開發者模式),右鍵點擊伺服器圖示 > 複製 ID

---

## ✅ 測試檢查清單

### 環境設定測試
- [ ] `.env` 檔案已正確設定
- [ ] 環境變數驗證功能正常
- [ ] 所有必要的環境變數都已設定

### Bot 連線測試
- [ ] Bot 能成功登入 Discord
- [ ] Bot 在伺服器中顯示為線上狀態
- [ ] Bot 狀態訊息正確顯示

### 事件處理測試
- [ ] Ready 事件正確觸發
- [ ] Console 顯示正確的啟動訊息
- [ ] 事件處理器正確載入

### 程式碼品質檢查
- [ ] 沒有硬編碼的敏感資訊
- [ ] 錯誤處理機制正常運作
- [ ] Console 日誌清晰易讀

---

## 🐛 常見問題排解

### 問題 1: Bot 無法登入

**錯誤訊息**: "An invalid token was provided"

**解決方案**:
1. 檢查 `.env` 中的 `DISCORD_TOKEN` 是否正確
2. 確認 Token 沒有多餘的空格或換行
3. 重新產生 Token 並更新 `.env`

### 問題 2: 缺少環境變數

**錯誤訊息**: "缺少必要的環境變數: DISCORD_TOKEN"

**解決方案**:
1. 確認 `.env` 檔案存在於專案根目錄
2. 檢查環境變數名稱是否正確
3. 重新啟動應用程式

### 問題 3: Bot 無法讀取訊息

**解決方案**:
1. 確認已啟用 MESSAGE CONTENT INTENT
2. 檢查 Bot 權限設定
3. 重新邀請 Bot 到伺服器

---

## 📝 實作檢查清單

完成此功能後,確認以下項目:

- [x] 所有檔案按照規定的結構創建在 `src/` 目錄下
- [x] 環境變數正確配置且有驗證機制
- [x] Bot 能成功連線並顯示就緒訊息
- [x] 事件處理系統正常運作
- [x] 程式碼符合專案規範(無硬編碼、適當的錯誤處理)
- [x] 已測試 Bot 基本功能
- [x] 提交變更: `git add . && git commit -m "feat: 完成 Discord Bot 基本設定"`
- [x] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Discord.js 官方文檔](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Phase 1.2 - Google Calendar API 串接](./02-google-calendar-api.md)

---

**下一步**: 完成此功能後,繼續進行 [Phase 1.2 - Google Calendar API 串接](./02-google-calendar-api.md)
