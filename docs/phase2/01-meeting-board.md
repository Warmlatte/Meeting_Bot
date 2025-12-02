# Phase 2.1 - 會議布告欄自動更新

> **功能編號**: P2-01
> **功能名稱**: 會議布告欄自動更新功能
> **預估時間**: 4-5 小時
> **依賴項目**: P1-02 (Google Calendar API), P1-03 (/add-meeting 指令)
> **完成標準**: Bot 能在專屬頻道自動更新今日會議和本週會議布告欄

---

## 📋 功能概述

實作會議布告欄功能,在專屬頻道顯示「今日會議」和「本週會議」兩個固定訊息,並透過定時任務每日 00:00 自動更新,以及在會議新增/修改/取消時即時更新。

## 🎯 實作目標

- [ ] 建立會議布告欄頻道設定
- [ ] 實作今日會議 Embed 格式
- [ ] 實作本週會議 Embed 格式
- [ ] 實作定時更新任務 (每日 00:00)
- [ ] 實作即時更新機制
- [ ] 實作布告欄訊息管理 (儲存/更新 Message ID)

---

## 📦 所需檔案

```
src/
├── jobs/
│   ├── scheduler.js          # 任務調度器 (擴充)
│   └── update-board.js       # 更新布告欄任務
├── utils/
│   ├── embed-builder.js      # Embed 訊息建構器 (擴充)
│   └── board-manager.js      # 布告欄管理器
├── services/
│   └── calendar.js           # Calendar 服務 (已完成)
└── config/
    └── env.js                # 環境變數 (擴充)
```

---

## 💻 實作步驟

### Step 1: 更新環境變數 (`src/config/env.js`)

新增布告欄頻道 ID:

```javascript
module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID,
    boardChannelId: process.env.BOARD_CHANNEL_ID, // 新增
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
  },
  timezone: process.env.TIMEZONE || 'Asia/Taipei',
};
```

更新 `.env.example`:

```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
GUILD_ID=your_guild_id
BOARD_CHANNEL_ID=your_board_channel_id

# Google API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_CALENDAR_ID=your_calendar_id

# Settings
TIMEZONE=Asia/Taipei
NODE_ENV=development
```

### Step 2: 建立布告欄管理器 (`src/utils/board-manager.js`)

```javascript
const fs = require('fs');
const path = require('path');

/**
 * 布告欄管理器
 * 管理布告欄訊息 ID 的儲存與讀取
 */
class BoardManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data/board-messages.json');
    this.data = this.load();
  }

  /**
   * 載入資料
   */
  load() {
    try {
      // 確保 data 目錄存在
      const dataDir = path.dirname(this.dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('[BoardManager] 載入資料失敗:', error);
    }

    return {
      todayMessageId: null,
      weekMessageId: null,
      lastUpdate: null,
    };
  }

  /**
   * 儲存資料
   */
  save() {
    try {
      const dataDir = path.dirname(this.dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('[BoardManager] 儲存資料失敗:', error);
    }
  }

  /**
   * 取得今日會議訊息 ID
   */
  getTodayMessageId() {
    return this.data.todayMessageId;
  }

  /**
   * 設定今日會議訊息 ID
   */
  setTodayMessageId(messageId) {
    this.data.todayMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得本週會議訊息 ID
   */
  getWeekMessageId() {
    return this.data.weekMessageId;
  }

  /**
   * 設定本週會議訊息 ID
   */
  setWeekMessageId(messageId) {
    this.data.weekMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 重置所有訊息 ID (用於重建布告欄)
   */
  reset() {
    this.data = {
      todayMessageId: null,
      weekMessageId: null,
      lastUpdate: null,
    };
    this.save();
  }

  /**
   * 取得最後更新時間
   */
  getLastUpdate() {
    return this.data.lastUpdate;
  }
}

// 單例模式
const boardManager = new BoardManager();

module.exports = boardManager;
```

### Step 3: 擴充 EmbedBuilder (`src/utils/embed-builder.js`)

新增布告欄 Embed 方法:

```javascript
// 在 EmbedBuilderUtil 類別中新增以下方法

/**
 * 建立今日會議布告欄 Embed
 * @param {Array} meetings - 今日會議列表
 * @returns {EmbedBuilder}
 */
static createTodayBoardEmbed(meetings) {
  const today = dayjs();
  const embed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.PRIMARY)
    .setTitle(`📅 今日會議 (${today.format('YYYY-MM-DD')})`)
    .setTimestamp();

  if (meetings.length === 0) {
    embed.setDescription('今天沒有會議 🎉');
    embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
    return embed;
  }

  let description = '';

  // 按時間排序
  const sortedMeetings = meetings.sort((a, b) => {
    return dayjs(a.startTime).isBefore(dayjs(b.startTime)) ? -1 : 1;
  });

  for (const meeting of sortedMeetings) {
    const startTime = dayjs(meeting.startTime);
    const endTime = dayjs(meeting.endTime);

    // 判斷會議是否已結束
    const isPast = dayjs().isAfter(endTime);
    const statusEmoji = isPast ? '✅' : '🕐';

    description += `\n${statusEmoji} **${startTime.format('HH:mm')}** | ${meeting.type} | **${meeting.title}**\n`;
    description += `   📍 ${meeting.location}\n`;

    if (meeting.participants.length > 0) {
      const participantMentions = meeting.participants
        .map(p => `<@${p.user_id}>`)
        .join(' ');
      description += `   👥 ${participantMentions}\n`;
    }

    description += '\n';
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `共 ${meetings.length} 場會議 • Meeting Bot • 每日 00:00 自動更新`
  });

  return embed;
}

/**
 * 建立本週會議布告欄 Embed
 * @param {Array} meetings - 本週會議列表
 * @returns {EmbedBuilder}
 */
static createWeekBoardEmbed(meetings) {
  const weekStart = dayjs().startOf('isoWeek');
  const weekEnd = dayjs().endOf('isoWeek');

  const embed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.PRIMARY)
    .setTitle(`📆 本週會議 (${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')})`)
    .setTimestamp();

  if (meetings.length === 0) {
    embed.setDescription('本週沒有會議 🎉');
    embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
    return embed;
  }

  // 按日期分組
  const meetingsByDay = {};

  for (const meeting of meetings) {
    const startTime = dayjs(meeting.startTime);
    const dayKey = startTime.format('YYYY-MM-DD');

    if (!meetingsByDay[dayKey]) {
      meetingsByDay[dayKey] = [];
    }

    meetingsByDay[dayKey].push(meeting);
  }

  let description = '';

  // 按日期順序顯示
  const sortedDays = Object.keys(meetingsByDay).sort();

  for (const dayKey of sortedDays) {
    const date = dayjs(dayKey);
    const dayMeetings = meetingsByDay[dayKey];

    // 日期標題
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
    const isToday = date.isSame(dayjs(), 'day');
    const dayTitle = isToday
      ? `【${date.format('MM/DD')} 週${dayOfWeek}】 ⭐ 今天`
      : `【${date.format('MM/DD')} 週${dayOfWeek}】`;

    description += `\n**${dayTitle}**\n`;

    // 排序會議
    const sortedMeetings = dayMeetings.sort((a, b) => {
      return dayjs(a.startTime).isBefore(dayjs(b.startTime)) ? -1 : 1;
    });

    for (const meeting of sortedMeetings) {
      const startTime = dayjs(meeting.startTime);
      const endTime = dayjs(meeting.endTime);

      description += `🕐 ${startTime.format('HH:mm')} | ${meeting.type} | ${meeting.title}\n`;
      description += `   📍 ${meeting.location}\n`;

      if (meeting.participants.length > 0 && meeting.participants.length <= 5) {
        const participantMentions = meeting.participants
          .map(p => `<@${p.user_id}>`)
          .join(' ');
        description += `   👥 ${participantMentions}\n`;
      } else if (meeting.participants.length > 5) {
        description += `   👥 ${meeting.participants.length} 位參加者\n`;
      }

      description += '\n';
    }
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `共 ${meetings.length} 場會議 • Meeting Bot • 每日 00:00 自動更新`
  });

  return embed;
}
```

### Step 4: 實作更新布告欄任務 (`src/jobs/update-board.js`)

```javascript
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const boardManager = require('../utils/board-manager');
const config = require('../config/env');
const dayjs = require('dayjs');

/**
 * 更新布告欄任務
 */
class UpdateBoardJob {
  constructor(client) {
    this.client = client;
    this.calendarService = new CalendarService();
  }

  /**
   * 執行更新任務
   */
  async execute() {
    console.log('[UpdateBoardJob] 開始更新布告欄...');

    try {
      const channel = await this.client.channels.fetch(config.discord.boardChannelId);

      if (!channel) {
        console.error('[UpdateBoardJob] 找不到布告欄頻道');
        return;
      }

      // 更新今日會議
      await this.updateTodayBoard(channel);

      // 更新本週會議
      await this.updateWeekBoard(channel);

      console.log('[UpdateBoardJob] ✅ 布告欄更新完成');
    } catch (error) {
      console.error('[UpdateBoardJob] 更新失敗:', error);
    }
  }

  /**
   * 更新今日會議布告欄
   */
  async updateTodayBoard(channel) {
    console.log('[UpdateBoardJob] 更新今日會議...');

    // 查詢今日會議
    const timeMin = dayjs().startOf('day').toISOString();
    const timeMax = dayjs().endOf('day').toISOString();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const meetings = events.map(event => this.calendarService.parseMeetingEvent(event));

    const embed = EmbedBuilderUtil.createTodayBoardEmbed(meetings);

    // 更新或建立訊息
    const messageId = boardManager.getTodayMessageId();

    try {
      if (messageId) {
        // 嘗試更新現有訊息
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新今日會議訊息');
      } else {
        // 建立新訊息
        const message = await channel.send({ embeds: [embed] });
        boardManager.setTodayMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立今日會議訊息');
      }
    } catch (error) {
      // 訊息可能被刪除,重新建立
      console.log('[UpdateBoardJob] 舊訊息不存在,建立新訊息...');
      const message = await channel.send({ embeds: [embed] });
      boardManager.setTodayMessageId(message.id);
      console.log('[UpdateBoardJob] ✅ 已重新建立今日會議訊息');
    }
  }

  /**
   * 更新本週會議布告欄
   */
  async updateWeekBoard(channel) {
    console.log('[UpdateBoardJob] 更新本週會議...');

    // 查詢本週會議
    const timeMin = dayjs().startOf('isoWeek').toISOString();
    const timeMax = dayjs().endOf('isoWeek').toISOString();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const meetings = events.map(event => this.calendarService.parseMeetingEvent(event));

    const embed = EmbedBuilderUtil.createWeekBoardEmbed(meetings);

    // 更新或建立訊息
    const messageId = boardManager.getWeekMessageId();

    try {
      if (messageId) {
        // 嘗試更新現有訊息
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新本週會議訊息');
      } else {
        // 建立新訊息
        const message = await channel.send({ embeds: [embed] });
        boardManager.setWeekMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立本週會議訊息');
      }
    } catch (error) {
      // 訊息可能被刪除,重新建立
      console.log('[UpdateBoardJob] 舊訊息不存在,建立新訊息...');
      const message = await channel.send({ embeds: [embed] });
      boardManager.setWeekMessageId(message.id);
      console.log('[UpdateBoardJob] ✅ 已重新建立本週會議訊息');
    }
  }

  /**
   * 即時更新布告欄 (會議新增/修改/取消時呼叫)
   */
  async quickUpdate() {
    console.log('[UpdateBoardJob] 執行即時更新...');
    await this.execute();
  }
}

module.exports = UpdateBoardJob;
```

### Step 5: 更新調度器 (`src/jobs/scheduler.js`)

新增布告欄更新任務:

```javascript
const cron = require('node-cron');
const SendRemindersJob = require('./send-reminders');
const UpdateBoardJob = require('./update-board');

class Scheduler {
  constructor(client) {
    this.client = client;
    this.jobs = [];
    this.updateBoardJob = new UpdateBoardJob(client); // 儲存實例以供手動呼叫
  }

  start() {
    console.log('[Scheduler] 啟動定時任務調度器...');

    // 每 10 分鐘檢查並發送會議提醒
    const reminderJob = cron.schedule('*/10 * * * *', async () => {
      console.log('[Scheduler] 執行提醒任務 (每 10 分鐘)');
      const sendRemindersJob = new SendRemindersJob(this.client);
      await sendRemindersJob.execute();
    });

    this.jobs.push({ name: 'send-reminders', job: reminderJob });

    // 每日 00:00 更新布告欄
    const boardJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Scheduler] 執行布告欄更新 (每日 00:00)');
      await this.updateBoardJob.execute();
    });

    this.jobs.push({ name: 'update-board', job: boardJob });

    console.log(`[Scheduler] ✅ 已啟動 ${this.jobs.length} 個定時任務`);
    this.logSchedule();

    // Bot 啟動時立即更新一次布告欄
    setTimeout(async () => {
      console.log('[Scheduler] 執行初始布告欄更新...');
      await this.updateBoardJob.execute();
    }, 5000); // 延遲 5 秒確保 Bot 完全啟動
  }

  stop() {
    console.log('[Scheduler] 停止所有定時任務...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`[Scheduler] ✅ 已停止任務: ${name}`);
    });
  }

  async runJob(jobName) {
    console.log(`[Scheduler] 手動執行任務: ${jobName}`);

    switch (jobName) {
      case 'send-reminders':
        const sendRemindersJob = new SendRemindersJob(this.client);
        await sendRemindersJob.execute();
        break;

      case 'update-board':
        await this.updateBoardJob.execute();
        break;

      default:
        console.log(`[Scheduler] ❌ 找不到任務: ${jobName}`);
    }
  }

  /**
   * 即時更新布告欄 (供外部呼叫)
   */
  async triggerBoardUpdate() {
    await this.updateBoardJob.quickUpdate();
  }

  logSchedule() {
    console.log('\n[Scheduler] 定時任務排程:');
    console.log('  • send-reminders: 每 10 分鐘 (*/10 * * * *)');
    console.log('  • update-board: 每日 00:00 (0 0 * * *)');
    console.log('');
  }
}

module.exports = Scheduler;
```

### Step 6: 整合即時更新到 add-meeting

在 `/add-meeting` 指令建立會議成功後觸發布告欄更新:

```javascript
// 在 src/commands/add-meeting.js 的 createMeeting 函式中

async function createMeeting(interaction, data) {
  try {
    const calendarService = new CalendarService();
    const event = await calendarService.createMeeting(data);

    const confirmEmbed = EmbedBuilderUtil.createMeetingConfirmEmbed(data, event);

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [confirmEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }

    tempMeetingData.delete(interaction.user.id);

    // 觸發布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerBoardUpdate();
      console.log('[AddMeeting] 已觸發布告欄更新');
    }
  } catch (error) {
    // ... 錯誤處理
  }
}
```

### Step 7: 更新主程式 (`src/index.js`)

將 scheduler 實例掛載到 client:

```javascript
// 在 client.once('ready') 中

client.once('ready', () => {
  console.log(`✅ Bot 已登入: ${client.user.tag}`);

  // 啟動調度器
  const scheduler = new Scheduler(client);
  scheduler.start();

  // 將 scheduler 掛載到 client 供其他模組使用
  client.scheduler = scheduler;
});
```

### Step 8: 新增測試指令 (可選)

```javascript
// src/commands/update-board.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-board')
    .setDescription('手動更新布告欄 (僅管理員)'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ 此指令僅限管理員使用',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.client.scheduler.triggerBoardUpdate();
      await interaction.editReply({
        content: '✅ 布告欄已更新',
      });
    } catch (error) {
      console.error('更新布告欄失敗:', error);
      await interaction.editReply({
        content: `❌ 更新失敗: ${error.message}`,
      });
    }
  },
};
```

---

## 🎨 布告欄頻道設定

### Discord 頻道設定

1. **建立頻道**:
   - 名稱: `📋-會議布告欄`
   - 類型: 文字頻道
   - 分類: 資訊/公告

2. **權限設定**:
   - @everyone: 檢視頻道 ✅, 發送訊息 ❌
   - Bot: 檢視頻道 ✅, 發送訊息 ✅, 管理訊息 ✅, 嵌入連結 ✅

3. **取得頻道 ID**:
   - 右鍵點擊頻道 → 複製 ID
   - 貼到 `.env` 的 `BOARD_CHANNEL_ID`

---

## ✅ 測試檢查清單

### 基本功能測試
- [ ] 布告欄頻道設定正確
- [ ] Bot 啟動時自動建立布告欄
- [ ] 今日會議訊息正確顯示
- [ ] 本週會議訊息正確顯示

### 定時更新測試
- [ ] 每日 00:00 自動更新
- [ ] 更新後訊息內容正確
- [ ] 不會建立重複訊息
- [ ] Message ID 正確儲存

### 即時更新測試
- [ ] 新增會議後立即更新
- [ ] 編輯會議後立即更新
- [ ] 取消會議後立即更新
- [ ] 更新不影響使用者體驗

### 顯示格式測試
- [ ] 今日會議格式美觀
- [ ] 本週會議按日期分組
- [ ] 參加者提及正確顯示
- [ ] 時間格式正確
- [ ] 空會議狀態正確顯示

### 錯誤處理測試
- [ ] 頻道不存在時的處理
- [ ] 訊息被刪除時自動重建
- [ ] Google Calendar API 錯誤處理
- [ ] 權限不足時的處理

---

## 📝 實作檢查清單

- [ ] 環境變數已更新
- [ ] BoardManager 已實作
- [ ] EmbedBuilder 新增布告欄 Embed 方法
- [ ] UpdateBoardJob 已實作
- [ ] Scheduler 已整合布告欄任務
- [ ] add-meeting 已整合即時更新
- [ ] 主程式已掛載 scheduler
- [ ] 測試指令已實作 (可選)
- [ ] data 目錄已建立
- [ ] 所有功能已測試
- [ ] 提交變更: `git add . && git commit -m "feat: 完成會議布告欄功能"`
- [ ] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Discord.js Channels](https://discordjs.guide/popular-topics/working-with-channels.html)
- [Discord.js Permissions](https://discordjs.guide/popular-topics/permissions.html)
- [Phase 1.5 - 基本提醒功能](../phase1/05-basic-reminders.md)
- [Phase 2.2 - 多時段提醒](./02-multi-reminders.md)

---

## 💡 實作提示

### 布告欄優化建議
- 可以新增「本月會議」布告欄
- 可以使用不同顏色區分會議狀態 (已結束/進行中/未開始)
- 可以新增會議倒數計時器
- 可以在布告欄下方新增快速操作按鈕

### 效能優化建議
- 快取會議查詢結果,避免頻繁呼叫 API
- 使用 partial update 只更新變更的欄位
- 實作更新防抖機制,避免短時間內多次更新
- 定期清理過期的布告欄訊息

### 視覺優化建議
- 使用 Emoji 增加視覺吸引力
- 新增會議類型圖示
- 使用分隔線美化排版
- 高亮今日會議和即將開始的會議

### 部署注意事項
- 確保 data 目錄在 .gitignore 中
- Message ID 資料建議備份
- 時區設定務必正確
- 布告欄頻道 ID 務必在環境變數中設定

---

**下一步**: 完成此功能後,繼續進行 [Phase 2.2 - 多時段提醒](./02-multi-reminders.md)
