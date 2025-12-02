# Phase 1.2 - Google Calendar API 串接

> **功能編號**: P1-02
> **功能名稱**: Google Calendar API 串接
> **預估時間**: 3-4 小時
> **依賴項目**: P1-01 (Discord Bot 基本設定)
> **完成標準**: 能成功與 Google Calendar API 互動並執行 CRUD 操作

---

## 📋 功能概述

整合 Google Calendar API,實作 CalendarService 服務層,提供會議的建立、查詢、更新、刪除等功能。

## 🎯 實作目標

- [x] 安裝 Google API 相關套件
- [x] 設定 Google OAuth 2.0 認證
- [x] 實作 CalendarService 服務類別
- [x] 實作會議資料的格式化與解析
- [x] 測試 API 連線與基本操作

---

## 📦 所需套件

```json
{
  "dependencies": {
    "googleapis": "^128.0.0",
    "google-auth-library": "^9.0.0",
    "dayjs": "^1.11.10"
  }
}
```

安裝指令:
```bash
npm install googleapis google-auth-library dayjs
```

---

## 🔧 環境變數設定

### 新增到 `.env`

```env
# Google API
GOOGLE_CLIENT_ID=你的Google OAuth客戶端ID
GOOGLE_CLIENT_SECRET=你的Google OAuth密鑰
GOOGLE_REFRESH_TOKEN=你的Google重新整理權杖
GOOGLE_CALENDAR_ID=你的Google日曆ID
```

### 更新 `src/config/env.js`

```javascript
const config = {
  // Discord 設定
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },

  // Google API 設定
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
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
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_CALENDAR_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`缺少必要的環境變數: ${missing.join(', ')}`);
  }
}
```

---

## 💻 實作步驟

### Step 1: 建立 CalendarService (`src/services/calendar.js`)

```javascript
const { google } = require('googleapis');
const dayjs = require('dayjs');
const config = require('../config/env');

/**
 * Google Calendar 服務類別
 */
class CalendarService {
  constructor() {
    // 初始化 OAuth2 客戶端
    this.auth = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    // 設定認證憑證
    this.auth.setCredentials({
      refresh_token: config.google.refreshToken
    });

    // 初始化 Calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.calendarId = config.google.calendarId;
  }

  /**
   * 建立會議
   * @param {Object} meetingData - 會議資料
   * @returns {Promise<Object>} - 建立的事件資料
   */
  async createMeeting(meetingData) {
    try {
      const startTime = dayjs(`${meetingData.date} ${meetingData.time}`);
      const endTime = startTime.add(meetingData.duration || 2, 'hour');

      const event = {
        summary: `[${meetingData.type}] ${meetingData.title}`,
        location: meetingData.location,
        description: this.formatDescription(meetingData),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: config.timezone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: config.timezone,
        },
        attendees: meetingData.participants.map(p => ({
          email: `user${p.user_id}@discord.bot`,
          displayName: p.name,
        })),
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log(`✅ 會議已建立: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 建立會議失敗:', error);
      throw new Error(`建立會議失敗: ${error.message}`);
    }
  }

  /**
   * 取得會議列表
   * @param {string} timeMin - 開始時間 (ISO 格式)
   * @param {string} timeMax - 結束時間 (ISO 格式)
   * @returns {Promise<Array>} - 會議列表
   */
  async listMeetings(timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log(`📋 找到 ${response.data.items.length} 個會議`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ 取得會議列表失敗:', error);
      throw new Error(`取得會議列表失敗: ${error.message}`);
    }
  }

  /**
   * 取得單一會議
   * @param {string} eventId - 事件 ID
   * @returns {Promise<Object>} - 會議資料
   */
  async getMeeting(eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      return response.data;
    } catch (error) {
      console.error('❌ 取得會議失敗:', error);
      throw new Error(`取得會議失敗: ${error.message}`);
    }
  }

  /**
   * 更新會議
   * @param {string} eventId - 事件 ID
   * @param {Object} meetingData - 更新的會議資料
   * @returns {Promise<Object>} - 更新後的事件資料
   */
  async updateMeeting(eventId, meetingData) {
    try {
      const event = await this.getMeeting(eventId);

      // 更新欄位
      if (meetingData.title || meetingData.type) {
        event.summary = `[${meetingData.type || '線上會議'}] ${meetingData.title || event.summary}`;
      }
      if (meetingData.location) {
        event.location = meetingData.location;
      }
      if (meetingData.content || meetingData.participants) {
        event.description = this.formatDescription(meetingData);
      }
      if (meetingData.date || meetingData.time) {
        const startTime = dayjs(`${meetingData.date} ${meetingData.time}`);
        const endTime = startTime.add(meetingData.duration || 2, 'hour');
        event.start = {
          dateTime: startTime.toISOString(),
          timeZone: config.timezone,
        };
        event.end = {
          dateTime: endTime.toISOString(),
          timeZone: config.timezone,
        };
      }

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: event,
      });

      console.log(`✅ 會議已更新: ${eventId}`);
      return response.data;
    } catch (error) {
      console.error('❌ 更新會議失敗:', error);
      throw new Error(`更新會議失敗: ${error.message}`);
    }
  }

  /**
   * 刪除會議
   * @param {string} eventId - 事件 ID
   * @returns {Promise<void>}
   */
  async deleteMeeting(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log(`✅ 會議已刪除: ${eventId}`);
    } catch (error) {
      console.error('❌ 刪除會議失敗:', error);
      throw new Error(`刪除會議失敗: ${error.message}`);
    }
  }

  /**
   * 檢查會議時間衝突
   * @param {string} startTime - 開始時間 (ISO 格式)
   * @param {string} endTime - 結束時間 (ISO 格式)
   * @param {Array} participants - 參加者列表
   * @returns {Promise<Object>} - 衝突資訊 { hasConflict: boolean, conflicts: Array }
   */
  async checkConflicts(startTime, endTime, participants) {
    try {
      const meetings = await this.listMeetings(startTime, endTime);
      const conflicts = [];

      for (const meeting of meetings) {
        const meetingInfo = this.parseDescription(meeting.description);
        if (!meetingInfo.discordInfo) continue;

        // 檢查是否有相同參加者
        const conflictingParticipants = participants.filter(p =>
          meetingInfo.discordInfo.participants.some(mp => mp.user_id === p.user_id)
        );

        if (conflictingParticipants.length > 0) {
          conflicts.push({
            meeting: meeting,
            participants: conflictingParticipants,
          });
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts,
      };
    } catch (error) {
      console.error('❌ 檢查衝突失敗:', error);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * 格式化會議描述
   * @param {Object} data - 會議資料
   * @returns {string} - 格式化的描述
   */
  formatDescription(data) {
    const discordInfo = {
      guild_id: data.guild_id,
      channel_id: data.channel_id,
      creator_id: data.creator_id,
      message_id: data.message_id || null,
      meeting_type: data.type,
      participants: data.participants || [],
    };

    return `=== 會議內容 ===
${data.content || '無'}

=== 參加者 ===
${data.participants ? data.participants.map(p => `@${p.name}`).join(' ') : '無'}

=== Discord 資訊 (JSON) ===
${JSON.stringify(discordInfo, null, 2)}`;
  }

  /**
   * 解析會議描述
   * @param {string} description - 會議描述
   * @returns {Object} - 解析後的資料
   */
  parseDescription(description) {
    if (!description) {
      return { content: '', participants: '', discordInfo: null };
    }

    const contentMatch = description.match(/=== 會議內容 ===\n(.*?)\n\n/s);
    const participantsMatch = description.match(/=== 參加者 ===\n(.*?)\n\n/s);
    const jsonMatch = description.match(/=== Discord 資訊 \(JSON\) ===\n({[\s\S]*})/);

    return {
      content: contentMatch ? contentMatch[1].trim() : '',
      participants: participantsMatch ? participantsMatch[1].trim() : '',
      discordInfo: jsonMatch ? JSON.parse(jsonMatch[1]) : null,
    };
  }
}

module.exports = CalendarService;
```

---

## 🔐 Google Calendar API 設定流程

### Step 1: 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「建立專案」
3. 輸入專案名稱 (例如: meeting-bot)
4. 點擊「建立」

### Step 2: 啟用 Google Calendar API

1. 在左側選單選擇「API 和服務」>「程式庫」
2. 搜尋「Google Calendar API」
3. 點擊「啟用」

### Step 3: 建立 OAuth 2.0 憑證

1. 在左側選單選擇「API 和服務」>「憑證」
2. 點擊「建立憑證」>「OAuth 用戶端 ID」
3. 如果是第一次,需要先設定「OAuth 同意畫面」:
   - 選擇「外部」
   - 填寫應用程式名稱
   - 新增測試使用者 (你的 Google 帳號)
4. 應用程式類型選擇「電腦版應用程式」
5. 輸入名稱 (例如: meeting-bot-client)
6. 點擊「建立」
7. 下載 JSON 檔案 (或複製 Client ID 和 Client Secret)

### Step 4: 取得 Refresh Token

建立一個臨時腳本 `get-refresh-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

// 從下載的 JSON 檔案中取得
const CLIENT_ID = '你的Client ID';
const CLIENT_SECRET = '你的Client Secret';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// 產生授權 URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('請在瀏覽器中開啟此 URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('輸入授權碼: ', async (code) => {
  rl.close();
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n✅ Refresh Token:', tokens.refresh_token);
  console.log('\n請將此 Token 加入 .env 檔案的 GOOGLE_REFRESH_TOKEN');
});
```

執行:
```bash
node get-refresh-token.js
```

### Step 5: 取得 Calendar ID

1. 前往 [Google Calendar](https://calendar.google.com/)
2. 在左側日曆列表中,點擊要使用的日曆旁的「⋮」
3. 選擇「設定和共用」
4. 向下捲動到「整合日曆」
5. 複製「日曆 ID」(通常是你的 email 或類似 `xxxxx@group.calendar.google.com`)

---

## ✅ 測試檢查清單

### API 連線測試
- [ ] OAuth 2.0 認證成功
- [ ] 能成功存取 Calendar API
- [ ] Refresh Token 正常運作

### CRUD 操作測試
- [ ] 能成功建立會議
- [ ] 能成功查詢會議列表
- [ ] 能成功取得單一會議
- [ ] 能成功更新會議
- [ ] 能成功刪除會議

### 資料格式測試
- [ ] Description 格式化正確
- [ ] Description 解析正確
- [ ] 時區處理正確
- [ ] 參加者資料儲存正確

### 錯誤處理測試
- [ ] API 錯誤有適當的錯誤訊息
- [ ] 網路錯誤有重試機制
- [ ] 無效的會議 ID 處理正確

---

## 🧪 測試程式碼範例

建立 `test-calendar.js` 來測試 CalendarService:

```javascript
const CalendarService = require('./src/services/calendar');
const dayjs = require('dayjs');

async function testCalendarService() {
  const calendarService = new CalendarService();

  console.log('🧪 開始測試 Calendar Service...\n');

  try {
    // 測試 1: 建立會議
    console.log('📝 測試 1: 建立會議');
    const testMeeting = {
      type: '線上會議',
      title: '測試會議',
      date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      time: '14:00',
      duration: 2,
      location: 'DC',
      content: '這是一個測試會議',
      guild_id: 'test_guild',
      channel_id: 'test_channel',
      creator_id: 'test_user',
      participants: [
        { name: '測試用戶1', user_id: '123' },
        { name: '測試用戶2', user_id: '456' },
      ],
    };

    const createdEvent = await calendarService.createMeeting(testMeeting);
    console.log(`✅ 會議建立成功,ID: ${createdEvent.id}\n`);

    // 測試 2: 查詢會議列表
    console.log('📋 測試 2: 查詢會議列表');
    const meetings = await calendarService.listMeetings(
      dayjs().startOf('day').toISOString(),
      dayjs().add(7, 'day').endOf('day').toISOString()
    );
    console.log(`✅ 找到 ${meetings.length} 個會議\n`);

    // 測試 3: 取得單一會議
    console.log('🔍 測試 3: 取得單一會議');
    const meeting = await calendarService.getMeeting(createdEvent.id);
    console.log(`✅ 會議標題: ${meeting.summary}\n`);

    // 測試 4: 解析 Description
    console.log('📖 測試 4: 解析 Description');
    const parsed = calendarService.parseDescription(meeting.description);
    console.log(`✅ 解析成功:`);
    console.log(`   - 內容: ${parsed.content}`);
    console.log(`   - 參加者: ${parsed.participants}`);
    console.log(`   - Discord 資訊: ${JSON.stringify(parsed.discordInfo, null, 2)}\n`);

    // 測試 5: 更新會議
    console.log('✏️  測試 5: 更新會議');
    await calendarService.updateMeeting(createdEvent.id, {
      title: '測試會議 (已更新)',
      type: '線下會議',
    });
    console.log(`✅ 會議更新成功\n`);

    // 測試 6: 刪除會議
    console.log('🗑️  測試 6: 刪除會議');
    await calendarService.deleteMeeting(createdEvent.id);
    console.log(`✅ 會議刪除成功\n`);

    console.log('🎉 所有測試通過!');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testCalendarService();
```

執行測試:
```bash
node test-calendar.js
```

---

## 🐛 常見問題排解

### 問題 1: 認證失敗

**錯誤訊息**: "invalid_grant" 或 "Token has been expired or revoked"

**解決方案**:
1. 確認 Refresh Token 正確
2. 重新取得 Refresh Token
3. 檢查 OAuth 同意畫面設定

### 問題 2: Calendar ID 錯誤

**錯誤訊息**: "Not Found"

**解決方案**:
1. 確認 Calendar ID 正確
2. 確認該日曆存在且可存取
3. 檢查 API 權限設定

### 問題 3: 時區問題

**解決方案**:
1. 確認 `TIMEZONE` 環境變數設定為 `Asia/Taipei`
2. 使用 dayjs 時確保正確處理時區
3. Calendar API 請求中明確指定 timeZone

---

## 📝 實作檢查清單

完成此功能後,確認以下項目:

- [x] Google Calendar API 已啟用
- [x] OAuth 2.0 認證已設定
- [x] CalendarService 類別已實作
- [x] 所有 CRUD 操作正常運作
- [x] 資料格式化與解析功能正確
- [x] 錯誤處理機制完善
- [x] 已測試所有主要功能
- [x] 提交變更: `git add . && git commit -m "feat: 完成 Google Calendar API 串接"`
- [x] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Google Calendar API 文檔](https://developers.google.com/calendar/api/v3/reference)
- [googleapis npm 套件](https://www.npmjs.com/package/googleapis)
- [Phase 1.1 - Discord Bot 基本設定](./01-discord-bot-setup.md)
- [Phase 1.3 - /add-meeting 指令](./03-add-meeting-command.md)

---

**下一步**: 完成此功能後,繼續進行 [Phase 1.3 - /add-meeting 指令](./03-add-meeting-command.md)
