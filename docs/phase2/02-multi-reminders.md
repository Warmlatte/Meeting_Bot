# Phase 2.2 - 多時段提醒功能

> **功能編號**: P2-02
> **功能名稱**: 多時段會議提醒功能
> **預估時間**: 2-3 小時
> **依賴項目**: P1-05 (基本提醒功能)
> **完成標準**: Bot 能在前一天 20:00 和會議前 2 小時發送提醒

---

## 📋 功能概述

擴充現有的提醒功能,新增前一天 20:00 的提醒時段,讓參加者提前一天知道隔天的會議安排。

## 🎯 實作目標

- [ ] 新增前一天 20:00 提醒邏輯
- [ ] 擴充提醒追蹤器支援多時段
- [ ] 更新提醒檢查任務
- [ ] 實作不同時段的提醒訊息格式
- [ ] 優化提醒發送邏輯

---

## 📦 所需檔案

```
src/
├── jobs/
│   └── send-reminders.js     # 發送提醒任務 (擴充)
└── utils/
    └── embed-builder.js      # Embed 訊息建構器 (已完成)
```

---

## 💻 實作步驟

### Step 1: 更新 SendRemindersJob (`src/jobs/send-reminders.js`)

擴充提醒任務以支援多時段:

```javascript
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const reminderTracker = require('../utils/reminder-tracker');
const dayjs = require('dayjs');

/**
 * 發送會議提醒任務 (多時段版本)
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
      // 1. 檢查前一天 20:00 提醒 (明天的會議)
      await this.checkOneDayReminders();

      // 2. 檢查 2 小時前提醒 (今天的會議)
      await this.checkTwoHourReminders();

      console.log('[SendRemindersJob] 提醒檢查完成');
    } catch (error) {
      console.error('[SendRemindersJob] 執行失敗:', error);
    }
  }

  /**
   * 檢查前一天 20:00 提醒
   */
  async checkOneDayReminders() {
    console.log('[SendRemindersJob] 檢查前一天提醒...');

    const now = dayjs();
    const currentHour = now.hour();

    // 只在 19:50 ~ 20:10 之間執行 (配合 10 分鐘執行間隔)
    if (currentHour !== 19 && currentHour !== 20) {
      console.log('[SendRemindersJob] 目前時間不在 20:00 提醒時段,跳過');
      return;
    }

    // 查詢明天一整天的會議
    const tomorrowStart = now.add(1, 'day').startOf('day');
    const tomorrowEnd = now.add(1, 'day').endOf('day');

    const events = await this.calendarService.listMeetings(
      tomorrowStart.toISOString(),
      tomorrowEnd.toISOString()
    );

    if (events.length === 0) {
      console.log('[SendRemindersJob] 明天沒有會議');
      return;
    }

    console.log(`[SendRemindersJob] 找到 ${events.length} 個明天的會議`);

    for (const event of events) {
      const meeting = this.calendarService.parseMeetingEvent(event);
      await this.sendReminder(meeting, '1d');
    }
  }

  /**
   * 檢查 2 小時前提醒
   */
  async checkTwoHourReminders() {
    console.log('[SendRemindersJob] 檢查 2 小時前提醒...');

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
      await this.checkAndSendTwoHourReminder(meeting);
    }
  }

  /**
   * 檢查並發送 2 小時前提醒
   * @param {Object} meeting - 會議資料
   */
  async checkAndSendTwoHourReminder(meeting) {
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
   * @param {string} reminderType - 提醒類型 ('1d' 或 '2h')
   */
  async sendReminder(meeting, reminderType) {
    // 檢查是否已發送過
    if (reminderTracker.hasReminded(meeting.id, reminderType)) {
      console.log(`[SendRemindersJob] 會議 ${meeting.id} 的 ${reminderType} 提醒已發送過`);
      return;
    }

    const reminderLabels = {
      '1d': '前一天 20:00',
      '2h': '2 小時前',
    };

    console.log(`[SendRemindersJob] 發送 ${reminderLabels[reminderType]} 提醒: ${meeting.title}`);

    const reminderEmbed = EmbedBuilderUtil.createReminderEmbed(meeting, reminderType);

    // 發送 DM 給所有參加者
    let successCount = 0;
    let failCount = 0;

    for (const participant of meeting.participants) {
      try {
        const user = await this.client.users.fetch(participant.user_id);
        await user.send({ embeds: [reminderEmbed] });
        successCount++;
        console.log(`[SendRemindersJob] ✅ 已發送 ${reminderLabels[reminderType]} 提醒給 ${participant.name}`);

        // 添加短暫延遲避免 Rate Limit
        await this.sleep(100);
      } catch (error) {
        failCount++;
        console.error(`[SendRemindersJob] ❌ 無法發送提醒給 ${participant.name}:`, error.message);
      }
    }

    // 標記為已提醒
    reminderTracker.markAsReminded(meeting.id, reminderType);

    console.log(`[SendRemindersJob] ${reminderLabels[reminderType]} 提醒發送完成: 成功 ${successCount}, 失敗 ${failCount}`);
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

  /**
   * 延遲函式 (避免 Rate Limit)
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SendRemindersJob;
```

### Step 2: 更新 Constants (如需要)

如果需要自訂提醒時間,可以在 `src/config/constants.js` 中新增:

```javascript
module.exports = {
  // ... 現有常數

  REMINDER_TIMES: {
    ONE_DAY: {
      hour: 20,           // 前一天 20:00
      minute: 0,
      label: '前一天晚上 8 點',
    },
    TWO_HOURS: {
      minutes: 120,       // 會議前 2 小時
      label: '會議前 2 小時',
    },
  },

  // ... 其他常數
};
```

### Step 3: 優化提醒訊息格式

確保 `src/utils/embed-builder.js` 中的 `createReminderEmbed` 方法支援不同時段:

```javascript
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
    '2h': {
      title: '⏰ 2 小時後有會議',
      color: CONSTANTS.COLORS.WARNING,
    },
    '1d': {
      title: '📅 明天有會議',
      color: CONSTANTS.COLORS.INFO,
    },
  };

  const config = reminderTexts[reminderType] || reminderTexts['2h'];

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(config.title)
    .addFields(
      { name: '📋 會議名稱', value: meeting.title, inline: false },
      { name: '📅 日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
      { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
      { name: '📍 地點', value: meeting.location, inline: true }
    )
    .setTimestamp();

  // 會議內容
  if (meeting.content) {
    const contentMatch = meeting.content.match(/=== 會議內容 ===\n(.*?)\n\n/s);
    if (contentMatch) {
      const content = contentMatch[1].trim();
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

  // 根據提醒類型添加不同的提示
  if (reminderType === '1d') {
    embed.addFields({
      name: '💡 提示',
      value: '這是明天會議的提前通知,請提前做好準備。',
      inline: false
    });
  } else if (reminderType === '2h') {
    embed.addFields({
      name: '💡 提示',
      value: '會議即將開始,請準備相關資料。',
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

  const emoji = reminderType === '1d' ? '📅' : '⏰';

  return `${emoji} **會議提醒**\n\n${participantMentions}\n\n${timeTexts[reminderType]} 有【${meeting.title}】會議\n📍 地點: ${meeting.location}`;
}
```

### Step 4: 新增提醒管理指令 (可選)

建立指令讓使用者查看提醒統計:

```javascript
// src/commands/reminder-stats.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reminderTracker = require('../utils/reminder-tracker');
const CONSTANTS = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder-stats')
    .setDescription('查看提醒統計 (僅管理員)'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ 此指令僅限管理員使用',
        ephemeral: true,
      });
      return;
    }

    const stats = reminderTracker.getStats();

    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.INFO)
      .setTitle('📊 提醒統計')
      .setDescription(`目前追蹤 ${stats.total} 筆提醒記錄`)
      .setTimestamp();

    if (stats.reminders.length > 0) {
      // 只顯示最近 10 筆
      const recentReminders = stats.reminders.slice(-10);
      const reminderList = recentReminders
        .map(r => `\`${r.key}\` - ${new Date(r.timestamp).toLocaleString('zh-TW')}`)
        .join('\n');

      embed.addFields({
        name: '最近提醒記錄',
        value: reminderList,
        inline: false
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
```

### Step 5: 新增重置提醒追蹤指令 (可選)

```javascript
// src/commands/reset-reminders.js

const { SlashCommandBuilder } = require('discord.js');
const reminderTracker = require('../utils/reminder-tracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-reminders')
    .setDescription('重置提醒追蹤器 (僅管理員)'),

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
      // 清空提醒追蹤器
      reminderTracker.reminders.clear();
      console.log('[ResetReminders] 已重置提醒追蹤器');

      await interaction.editReply({
        content: '✅ 提醒追蹤器已重置',
      });
    } catch (error) {
      console.error('重置提醒追蹤器失敗:', error);
      await interaction.editReply({
        content: `❌ 重置失敗: ${error.message}`,
      });
    }
  },
};
```

---

## 🔧 提醒時段說明

### 前一天 20:00 提醒
- **觸發條件**: 每天 20:00 (19:50-20:10 之間執行)
- **提醒對象**: 明天一整天的所有會議
- **用途**: 讓參加者提前一天知道隔天的會議安排

### 會議前 2 小時提醒
- **觸發條件**: 會議開始前 110-130 分鐘
- **提醒對象**: 即將開始的會議
- **用途**: 提醒參加者準備會議相關資料

---

## ✅ 測試檢查清單

### 基本功能測試
- [ ] 前一天 20:00 提醒正常發送
- [ ] 會議前 2 小時提醒正常發送
- [ ] 兩種提醒不會互相干擾
- [ ] 提醒追蹤器正確記錄

### 時機測試
- [ ] 只在 20:00 左右發送前一天提醒
- [ ] 不會在錯誤時間發送前一天提醒
- [ ] 2 小時提醒時機準確
- [ ] 不會重複發送相同類型的提醒

### 訊息格式測試
- [ ] 前一天提醒訊息格式正確
- [ ] 2 小時提醒訊息格式正確
- [ ] 兩種提醒顏色有區別
- [ ] 提示文字針對不同時段客製化

### 邊界情況測試
- [ ] 當天沒有會議時不發送提醒
- [ ] 明天沒有會議時不發送前一天提醒
- [ ] 同一會議在不同時段正確發送不同提醒
- [ ] 跨日會議的提醒處理正確

### 效能測試
- [ ] 多個會議同時提醒不會卡頓
- [ ] DM 發送有適當延遲避免 Rate Limit
- [ ] 提醒追蹤器記憶體使用穩定
- [ ] 任務執行時間合理

---

## 📝 實作檢查清單

- [ ] SendRemindersJob 已擴充多時段功能
- [ ] EmbedBuilder 已更新提醒訊息格式
- [ ] Constants 已定義提醒時間 (可選)
- [ ] 測試指令已實作 (可選)
- [ ] 所有功能已測試
- [ ] 提交變更: `git add . && git commit -m "feat: 完成多時段提醒功能"`
- [ ] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Phase 1.5 - 基本提醒功能](../phase1/05-basic-reminders.md)
- [Phase 2.1 - 會議布告欄](./01-meeting-board.md)
- [Phase 2.3 - 編輯/取消會議](./03-edit-cancel-meeting.md)

---

## 💡 實作提示

### 提醒時間優化建議
- 可以讓使用者自訂提醒時間
- 可以新增更多提醒時段 (如 30 分鐘前、1 小時前)
- 可以根據會議重要性調整提醒次數
- 可以支援週末/假日的不同提醒時間

### 提醒內容優化建議
- 根據會議類型客製化提醒訊息
- 新增會議準備事項清單
- 新增會議連結 (線上會議)
- 新增天氣資訊 (線下會議)

### 智能提醒建議
- 根據使用者時區自動調整提醒時間
- 根據使用者過往參與率調整提醒頻率
- 新增「快速回覆」按鈕 (參加/不參加)
- 整合行事曆應用的提醒功能

### 頻道提醒建議
- 可以在特定頻道發送公開提醒
- 可以使用 Thread 功能討論會議
- 可以新增投票功能確認參加人數
- 可以新增會議倒數計時器

### 錯誤處理建議
- 實作提醒發送失敗的補救機制
- 記錄所有提醒發送結果
- 定期檢查提醒系統健康狀態
- 新增管理員通知 (批量發送失敗時)

### 測試建議
- 使用測試帳號模擬不同時區
- 建立測試會議驗證提醒時機
- 使用日誌追蹤提醒發送狀態
- 定期檢查提醒追蹤器的資料完整性

---

**下一步**: 完成此功能後,繼續進行 [Phase 2.3 - 編輯/取消會議功能](./03-edit-cancel-meeting.md)
