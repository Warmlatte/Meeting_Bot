# Phase 1.5 - 基本提醒功能

> **功能編號**: P1-05
> **功能名稱**: 會議前 2 小時提醒功能
> **預估時間**: 3-4 小時
> **依賴項目**: P1-02 (Google Calendar API), P1-03 (/add-meeting 指令)
> **完成標準**: Bot 能在會議前 2 小時自動發送 DM 提醒給所有參加者

---

## 📋 功能概述

實作定時任務系統,使用 node-cron 每 10 分鐘檢查即將到來的會議,並在會議前 2 小時自動發送 DM 私訊提醒給所有參加者。

## 🎯 實作目標

- [ ] 設定 node-cron 定時任務
- [ ] 實作會議提醒檢查邏輯
- [ ] 實作 DM 私訊發送功能
- [ ] 設計提醒訊息 Embed 格式
- [ ] 實作提醒紀錄機制 (避免重複提醒)

---

## 📦 所需檔案

```
src/
├── jobs/
│   ├── scheduler.js          # 任務調度器
│   └── send-reminders.js     # 發送提醒任務
├── utils/
│   ├── embed-builder.js      # Embed 訊息建構器 (擴充)
│   └── reminder-tracker.js   # 提醒追蹤器
└── services/
    └── calendar.js           # Calendar 服務 (已完成)
```

---

## 💻 實作步驟

### Step 1: 安裝必要套件

```bash
npm install node-cron
```

### Step 2: 建立提醒追蹤器 (`src/utils/reminder-tracker.js`)

```javascript
/**
 * 提醒追蹤器
 * 追蹤已發送的提醒,避免重複發送
 */
class ReminderTracker {
  constructor() {
    // 儲存格式: { eventId-reminderType: timestamp }
    // reminderType: '2h' (2小時前) 或 '1d' (前一天)
    this.reminders = new Map();

    // 每天清理一次過期記錄 (超過 3 天的)
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * 檢查是否已發送提醒
   * @param {string} eventId - 會議 ID
   * @param {string} reminderType - 提醒類型 ('2h' 或 '1d')
   * @returns {boolean}
   */
  hasReminded(eventId, reminderType) {
    const key = `${eventId}-${reminderType}`;
    return this.reminders.has(key);
  }

  /**
   * 標記提醒已發送
   * @param {string} eventId - 會議 ID
   * @param {string} reminderType - 提醒類型
   */
  markAsReminded(eventId, reminderType) {
    const key = `${eventId}-${reminderType}`;
    this.reminders.set(key, Date.now());
  }

  /**
   * 清理過期記錄 (3 天前的)
   */
  cleanup() {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

    for (const [key, timestamp] of this.reminders.entries()) {
      if (timestamp < threeDaysAgo) {
        this.reminders.delete(key);
      }
    }

    console.log(`[ReminderTracker] 清理完成,剩餘 ${this.reminders.size} 筆記錄`);
  }

  /**
   * 取得提醒統計
   */
  getStats() {
    return {
      total: this.reminders.size,
      reminders: Array.from(this.reminders.entries()).map(([key, timestamp]) => ({
        key,
        timestamp: new Date(timestamp).toISOString(),
      })),
    };
  }
}

// 單例模式
const reminderTracker = new ReminderTracker();

module.exports = reminderTracker;
```

### Step 3: 擴充 EmbedBuilder (`src/utils/embed-builder.js`)

新增提醒訊息 Embed:

```javascript
// 在 EmbedBuilderUtil 類別中新增以下方法

/**
 * 建立會議提醒 Embed (DM 用)
 * @param {Object} meeting - 會議資料
 * @param {string} reminderType - 提醒類型 ('2h' 或 '1d')
 * @returns {EmbedBuilder}
 */
static createReminderEmbed(meeting, reminderType) {
  const startTime = dayjs(meeting.startTime);
  const endTime = dayjs(meeting.endTime);

  const reminderTexts = {
    '2h': '⏰ 2 小時後有會議',
    '1d': '📅 明天有會議',
  };

  const embed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.WARNING)
    .setTitle(reminderTexts[reminderType] || '🔔 會議提醒')
    .addFields(
      { name: '📋 會議名稱', value: meeting.title, inline: false },
      { name: '📅 日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
      { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
      { name: '📍 地點', value: meeting.location, inline: true }
    )
    .setTimestamp();

  // 會議內容
  if (meeting.content) {
    // 從 description 中提取會議內容
    const contentMatch = meeting.content.match(/=== 會議內容 ===\n(.*?)\n\n/s);
    if (contentMatch) {
      const content = contentMatch[1].trim();
      // 限制長度避免過長
      const displayContent = content.length > 200
        ? content.substring(0, 200) + '...'
        : content;
      embed.addFields({ name: '📝 會議內容', value: displayContent, inline: false });
    }
  }

  // 參加者
  if (meeting.participants && meeting.participants.length > 0) {
    const participantNames = meeting.participants
      .map(p => `• ${p.name}`)
      .join('\n');
    embed.addFields({
      name: `👥 參加者 (${meeting.participants.length})`,
      value: participantNames,
      inline: false
    });
  }

  embed.setFooter({ text: 'Meeting Bot 提醒服務' });

  return embed;
}

/**
 * 建立頻道提醒訊息內容
 * @param {Object} meeting - 會議資料
 * @param {string} reminderType - 提醒類型
 * @returns {string}
 */
static createChannelReminderText(meeting, reminderType) {
  const startTime = dayjs(meeting.startTime);
  const participantMentions = meeting.participants
    .map(p => `<@${p.user_id}>`)
    .join(' ');

  const timeTexts = {
    '2h': `2 小時後 (${startTime.format('HH:mm')})`,
    '1d': `明天 ${startTime.format('HH:mm')}`,
  };

  return `🔔 **會議提醒**\n\n${participantMentions}\n\n${timeTexts[reminderType]} 有【${meeting.title}】會議\n📍 地點: ${meeting.location}`;
}
```

### Step 4: 實作發送提醒任務 (`src/jobs/send-reminders.js`)

```javascript
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const reminderTracker = require('../utils/reminder-tracker');
const dayjs = require('dayjs');

/**
 * 發送會議提醒任務
 */
class SendRemindersJob {
  constructor(client) {
    this.client = client;
    this.calendarService = new CalendarService();
  }

  /**
   * 執行提醒任務
   */
  async execute() {
    console.log('[SendRemindersJob] 開始檢查會議提醒...');

    try {
      // 查詢未來 3 小時內的會議
      const now = dayjs();
      const timeMin = now.toISOString();
      const timeMax = now.add(3, 'hour').toISOString();

      const events = await this.calendarService.listMeetings(timeMin, timeMax);

      if (events.length === 0) {
        console.log('[SendRemindersJob] 沒有需要提醒的會議');
        return;
      }

      console.log(`[SendRemindersJob] 找到 ${events.length} 個即將到來的會議`);

      for (const event of events) {
        const meeting = this.calendarService.parseMeetingEvent(event);
        await this.checkAndSendReminder(meeting);
      }

      console.log('[SendRemindersJob] 提醒檢查完成');
    } catch (error) {
      console.error('[SendRemindersJob] 執行失敗:', error);
    }
  }

  /**
   * 檢查並發送提醒
   * @param {Object} meeting - 會議資料
   */
  async checkAndSendReminder(meeting) {
    const now = dayjs();
    const startTime = dayjs(meeting.startTime);
    const minutesUntilStart = startTime.diff(now, 'minute');

    // 2 小時前提醒 (110-130 分鐘之間,考慮任務執行間隔)
    if (minutesUntilStart >= 110 && minutesUntilStart <= 130) {
      await this.sendReminder(meeting, '2h');
    }
  }

  /**
   * 發送提醒
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型
   */
  async sendReminder(meeting, reminderType) {
    // 檢查是否已發送過
    if (reminderTracker.hasReminded(meeting.id, reminderType)) {
      console.log(`[SendRemindersJob] 會議 ${meeting.id} 的 ${reminderType} 提醒已發送過`);
      return;
    }

    console.log(`[SendRemindersJob] 發送 ${reminderType} 提醒: ${meeting.title}`);

    const reminderEmbed = EmbedBuilderUtil.createReminderEmbed(meeting, reminderType);

    // 發送 DM 給所有參加者
    let successCount = 0;
    let failCount = 0;

    for (const participant of meeting.participants) {
      try {
        const user = await this.client.users.fetch(participant.user_id);
        await user.send({ embeds: [reminderEmbed] });
        successCount++;
        console.log(`[SendRemindersJob] ✅ 已發送提醒給 ${participant.name} (${participant.user_id})`);
      } catch (error) {
        failCount++;
        console.error(`[SendRemindersJob] ❌ 無法發送提醒給 ${participant.name}:`, error.message);
      }
    }

    // 標記為已提醒
    reminderTracker.markAsReminded(meeting.id, reminderType);

    console.log(`[SendRemindersJob] 提醒發送完成: 成功 ${successCount}, 失敗 ${failCount}`);
  }

  /**
   * 發送頻道提醒 (可選功能)
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型
   */
  async sendChannelReminder(meeting, reminderType) {
    if (!meeting.discordInfo || !meeting.discordInfo.channel_id) {
      console.log('[SendRemindersJob] 沒有頻道資訊,跳過頻道提醒');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(meeting.discordInfo.channel_id);
      const reminderText = EmbedBuilderUtil.createChannelReminderText(meeting, reminderType);
      await channel.send(reminderText);
      console.log(`[SendRemindersJob] ✅ 已在頻道 ${channel.name} 發送提醒`);
    } catch (error) {
      console.error('[SendRemindersJob] ❌ 無法發送頻道提醒:', error.message);
    }
  }
}

module.exports = SendRemindersJob;
```

### Step 5: 建立任務調度器 (`src/jobs/scheduler.js`)

```javascript
const cron = require('node-cron');
const SendRemindersJob = require('./send-reminders');

/**
 * 任務調度器
 */
class Scheduler {
  constructor(client) {
    this.client = client;
    this.jobs = [];
  }

  /**
   * 啟動所有定時任務
   */
  start() {
    console.log('[Scheduler] 啟動定時任務調度器...');

    // 每 10 分鐘檢查並發送會議提醒
    const reminderJob = cron.schedule('*/10 * * * *', async () => {
      console.log('[Scheduler] 執行提醒任務 (每 10 分鐘)');
      const sendRemindersJob = new SendRemindersJob(this.client);
      await sendRemindersJob.execute();
    });

    this.jobs.push({ name: 'send-reminders', job: reminderJob });

    console.log(`[Scheduler] ✅ 已啟動 ${this.jobs.length} 個定時任務`);
    this.logSchedule();
  }

  /**
   * 停止所有定時任務
   */
  stop() {
    console.log('[Scheduler] 停止所有定時任務...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`[Scheduler] ✅ 已停止任務: ${name}`);
    });
  }

  /**
   * 手動執行特定任務 (用於測試)
   * @param {string} jobName - 任務名稱
   */
  async runJob(jobName) {
    console.log(`[Scheduler] 手動執行任務: ${jobName}`);

    switch (jobName) {
      case 'send-reminders':
        const sendRemindersJob = new SendRemindersJob(this.client);
        await sendRemindersJob.execute();
        break;

      default:
        console.log(`[Scheduler] ❌ 找不到任務: ${jobName}`);
    }
  }

  /**
   * 列出任務排程
   */
  logSchedule() {
    console.log('\n[Scheduler] 定時任務排程:');
    console.log('  • send-reminders: 每 10 分鐘 (*/10 * * * *)');
    console.log('');
  }
}

module.exports = Scheduler;
```

### Step 6: 更新主程式 (`src/index.js`)

在 Bot 啟動時初始化調度器:

```javascript
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config/env');
const fs = require('fs');
const path = require('path');
const Scheduler = require('./jobs/scheduler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

// 載入指令
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// 載入事件
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
}

// 啟動定時任務調度器
let scheduler;

client.once('ready', () => {
  console.log(`✅ Bot 已登入: ${client.user.tag}`);

  // 啟動調度器
  scheduler = new Scheduler(client);
  scheduler.start();
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n[Main] 收到 SIGINT,正在關閉...');
  if (scheduler) {
    scheduler.stop();
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Main] 收到 SIGTERM,正在關閉...');
  if (scheduler) {
    scheduler.stop();
  }
  client.destroy();
  process.exit(0);
});

client.login(config.discord.token);
```

### Step 7: 新增測試指令 (可選)

建立測試指令手動觸發提醒檢查:

```javascript
// src/commands/test-reminder.js

const { SlashCommandBuilder } = require('discord.js');
const SendRemindersJob = require('../jobs/send-reminders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-reminder')
    .setDescription('測試提醒功能 (僅管理員)'),

  async execute(interaction) {
    // 檢查權限
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ 此指令僅限管理員使用',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const reminderJob = new SendRemindersJob(interaction.client);
      await reminderJob.execute();

      await interaction.editReply({
        content: '✅ 提醒檢查已執行完成,請查看日誌',
      });
    } catch (error) {
      console.error('測試提醒失敗:', error);
      await interaction.editReply({
        content: `❌ 執行失敗: ${error.message}`,
      });
    }
  },
};
```

---

## 🔧 Cron 表達式說明

```
*/10 * * * *
│   │ │ │ │
│   │ │ │ └─ 星期幾 (0-7, 0 和 7 都代表星期日)
│   │ │ └─── 月份 (1-12)
│   │ └───── 日期 (1-31)
│   └─────── 小時 (0-23)
└─────────── 分鐘 (0-59)

範例:
• */10 * * * *  - 每 10 分鐘
• 0 */2 * * *   - 每 2 小時
• 0 9 * * *     - 每天 9:00
• 0 20 * * *    - 每天 20:00
• 0 0 * * 1     - 每週一 00:00
```

---

## ✅ 測試檢查清單

### 基本功能測試
- [ ] node-cron 定時任務正常啟動
- [ ] 提醒任務每 10 分鐘執行一次
- [ ] 能正確查詢即將到來的會議
- [ ] DM 提醒能成功發送

### 提醒時機測試
- [ ] 會議前 2 小時正確發送提醒
- [ ] 不會在錯誤時間發送提醒
- [ ] 不會重複發送相同提醒
- [ ] 提醒追蹤器正常運作

### 訊息格式測試
- [ ] DM Embed 格式美觀
- [ ] 會議資訊顯示完整
- [ ] 參加者列表正確顯示
- [ ] 會議內容正確提取

### 錯誤處理測試
- [ ] 用戶關閉 DM 時不會中斷程式
- [ ] Google Calendar API 錯誤時能正常處理
- [ ] 無效會議資料時能跳過處理
- [ ] 記錄發送失敗的情況

### 效能測試
- [ ] 提醒追蹤器自動清理過期記錄
- [ ] 多個會議同時提醒不會卡頓
- [ ] 記憶體使用量穩定
- [ ] 任務執行時間合理 (< 30 秒)

---

## 📝 實作檢查清單

- [ ] 安裝 node-cron 套件
- [ ] ReminderTracker 已實作
- [ ] EmbedBuilder 新增提醒 Embed 方法
- [ ] SendRemindersJob 已實作
- [ ] Scheduler 調度器已實作
- [ ] 主程式已整合調度器
- [ ] 測試指令已實作 (可選)
- [ ] 所有功能已測試
- [ ] 提交變更: `git add . && git commit -m "feat: 完成基本提醒功能"`
- [ ] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [node-cron 文檔](https://www.npmjs.com/package/node-cron)
- [Discord.js DM 訊息](https://discordjs.guide/popular-topics/embeds.html)
- [Cron 表達式生成器](https://crontab.guru/)
- [Phase 1.4 - /list-meetings 指令](./04-list-meetings-command.md)
- [Phase 2.1 - 會議布告欄](../phase2/01-meeting-board.md)

---

## 💡 實作提示

### 提醒優化建議
- 可以讓使用者自訂提醒時間 (如 1 小時前、30 分鐘前)
- 可以新增「取消提醒」功能
- 可以記錄提醒閱讀狀態
- 可以支援多語言提醒訊息

### 錯誤處理建議
- 實作重試機制 (DM 發送失敗時)
- 記錄所有提醒發送結果到日誌
- 實作提醒失敗通知給管理員
- 定期檢查任務健康狀態

### 擴充功能建議
- 新增頻道提醒功能
- 新增 Email 提醒功能 (整合 SendGrid)
- 新增 LINE Notify 提醒功能
- 實作提醒偏好設定 (每位使用者可自訂)

### 部署注意事項
- Zeabur 重啟時提醒追蹤器會重置,考慮使用持久化儲存
- 注意時區設定 (process.env.TZ = 'Asia/Taipei')
- 定時任務在部署後可能需要幾分鐘才會生效
- 建議使用監控工具追蹤任務執行狀態

---

**下一步**: 完成 Phase 1 所有功能後,繼續進行 [Phase 2.1 - 會議布告欄自動更新](../phase2/01-meeting-board.md)
