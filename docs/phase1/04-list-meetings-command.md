# Phase 1.4 - /list-meetings 指令實作

> **功能編號**: P1-04
> **功能名稱**: /list-meetings 列出會議清單指令
> **預估時間**: 3-4 小時
> **依賴項目**: P1-02 (Google Calendar API), P1-03 (/add-meeting 指令)
> **完成標準**: 使用者能透過篩選選項查詢會議清單,並支援分頁瀏覽

---

## 📋 功能概述

實作 `/list-meetings` 斜線指令,提供今日、本週、本月的會議清單篩選功能,使用分頁按鈕讓使用者可以瀏覽多筆會議資料。

## 🎯 實作目標

- [ ] 建立 `/list-meetings` 斜線指令
- [ ] 實作時間範圍篩選 (今日/本週/本月)
- [ ] 實作分頁功能 (上一頁/下一頁按鈕)
- [ ] 設計會議列表 Embed 顯示格式
- [ ] 整合 CalendarService 查詢會議

---

## 📦 所需檔案

```
src/
├── commands/
│   └── list-meetings.js      # 主要指令檔案
├── utils/
│   └── embed-builder.js      # Embed 訊息建構器 (擴充)
└── services/
    └── calendar.js           # Calendar 服務 (已完成)
```

---

## 💻 實作步驟

### Step 1: 更新 CalendarService (`src/services/calendar.js`)

新增查詢會議的方法:

```javascript
// 在 CalendarService 類別中新增以下方法

/**
 * 取得特定時間範圍的會議列表
 * @param {string} timeMin - 開始時間 (ISO string)
 * @param {string} timeMax - 結束時間 (ISO string)
 * @returns {Array} - 會議列表
 */
async listMeetings(timeMin, timeMax) {
  try {
    const response = await this.calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('查詢會議失敗:', error);
    throw error;
  }
}

/**
 * 解析會議的 Discord 資訊
 * @param {Object} event - Google Calendar 事件
 * @returns {Object} - 解析後的會議資料
 */
parseMeetingEvent(event) {
  const descriptionMatch = event.description?.match(/=== Discord 資訊 \(JSON\) ===\n({.*})/s);
  let discordInfo = null;

  if (descriptionMatch) {
    try {
      discordInfo = JSON.parse(descriptionMatch[1]);
    } catch (error) {
      console.error('解析 Discord 資訊失敗:', error);
    }
  }

  // 從 summary 中提取會議類型和名稱
  const summaryMatch = event.summary?.match(/\[(.*?)\]\s*(.*)/);
  const meetingType = summaryMatch ? summaryMatch[1] : '未分類';
  const meetingTitle = summaryMatch ? summaryMatch[2] : event.summary;

  return {
    id: event.id,
    title: meetingTitle,
    type: meetingType,
    location: event.location,
    startTime: event.start.dateTime || event.start.date,
    endTime: event.end.dateTime || event.end.date,
    participants: discordInfo?.participants || [],
    content: event.description,
    discordInfo: discordInfo,
  };
}
```

### Step 2: 擴充 EmbedBuilder (`src/utils/embed-builder.js`)

新增會議列表 Embed 建構方法:

```javascript
// 在 EmbedBuilderUtil 類別中新增以下方法

/**
 * 建立會議列表 Embed
 * @param {Array} meetings - 會議列表
 * @param {string} filterType - 篩選類型 (today/this_week/this_month)
 * @param {number} page - 當前頁數
 * @param {number} totalPages - 總頁數
 * @returns {EmbedBuilder}
 */
static createMeetingListEmbed(meetings, filterType, page = 1, totalPages = 1) {
  const filterTitles = {
    today: '今日會議',
    this_week: '本週會議',
    this_month: '本月會議',
  };

  const embed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.PRIMARY)
    .setTitle(`📅 ${filterTitles[filterType] || '會議列表'}`)
    .setTimestamp();

  if (meetings.length === 0) {
    embed.setDescription('目前沒有會議');
    return embed;
  }

  // 每頁顯示 5 個會議
  const startIndex = (page - 1) * 5;
  const endIndex = startIndex + 5;
  const pageMeetings = meetings.slice(startIndex, endIndex);

  let description = '';

  for (const meeting of pageMeetings) {
    const startTime = dayjs(meeting.startTime);
    const endTime = dayjs(meeting.endTime);
    const participantCount = meeting.participants.length;

    description += `\n**🕐 ${startTime.format('MM/DD HH:mm')} - ${endTime.format('HH:mm')}**\n`;
    description += `📋 ${meeting.type} | ${meeting.title}\n`;
    description += `📍 ${meeting.location}\n`;
    description += `👥 參加者: ${participantCount} 位`;

    if (participantCount > 0 && participantCount <= 3) {
      const participantMentions = meeting.participants
        .map(p => `<@${p.user_id}>`)
        .join(' ');
      description += ` (${participantMentions})`;
    }

    description += `\n🆔 \`${meeting.id}\`\n`;
    description += `─────────────────\n`;
  }

  embed.setDescription(description);

  // 添加頁碼
  if (totalPages > 1) {
    embed.setFooter({ text: `第 ${page} / ${totalPages} 頁 • Meeting Bot` });
  } else {
    embed.setFooter({ text: 'Meeting Bot' });
  }

  return embed;
}

/**
 * 建立空會議列表 Embed
 * @param {string} filterType - 篩選類型
 * @returns {EmbedBuilder}
 */
static createEmptyMeetingListEmbed(filterType) {
  const filterTitles = {
    today: '今日',
    this_week: '本週',
    this_month: '本月',
  };

  return new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.INFO)
    .setTitle(`📅 ${filterTitles[filterType]}會議`)
    .setDescription('目前沒有會議')
    .setTimestamp()
    .setFooter({ text: 'Meeting Bot' });
}
```

### Step 3: 實作 /list-meetings 指令 (`src/commands/list-meetings.js`)

```javascript
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(isoWeek);

// 儲存分頁資料 (使用 Map,key 為 messageId)
const paginationData = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-meetings')
    .setDescription('列出會議清單'),

  async execute(interaction) {
    // 建立篩選選單
    const filterSelect = new StringSelectMenuBuilder()
      .setCustomId('meeting_list_filter')
      .setPlaceholder('選擇時間範圍')
      .addOptions([
        {
          label: '今日會議',
          value: 'today',
          description: '顯示今天的所有會議',
          emoji: '📅',
        },
        {
          label: '本週會議',
          value: 'this_week',
          description: '顯示本週的所有會議',
          emoji: '📆',
        },
        {
          label: '本月會議',
          value: 'this_month',
          description: '顯示本月的所有會議',
          emoji: '🗓️',
        },
      ]);

    await interaction.reply({
      content: '請選擇要查詢的時間範圍:',
      components: [new ActionRowBuilder().addComponents(filterSelect)],
      ephemeral: true,
    });
  },
};

/**
 * 處理篩選選擇
 */
async function handleFilterSelection(interaction) {
  await interaction.deferUpdate();

  const filterType = interaction.values[0];
  const { timeMin, timeMax } = getTimeRange(filterType);

  try {
    const calendarService = new CalendarService();
    const events = await calendarService.listMeetings(timeMin, timeMax);

    // 解析會議資料
    const meetings = events.map(event => calendarService.parseMeetingEvent(event));

    if (meetings.length === 0) {
      const emptyEmbed = EmbedBuilderUtil.createEmptyMeetingListEmbed(filterType);
      await interaction.editReply({
        content: null,
        embeds: [emptyEmbed],
        components: [],
      });
      return;
    }

    // 建立分頁
    const totalPages = Math.ceil(meetings.length / 5);
    const currentPage = 1;

    const embed = EmbedBuilderUtil.createMeetingListEmbed(
      meetings,
      filterType,
      currentPage,
      totalPages
    );

    const components = [];

    // 如果有多頁,顯示分頁按鈕
    if (totalPages > 1) {
      const paginationButtons = createPaginationButtons(currentPage, totalPages);
      components.push(paginationButtons);
    }

    const reply = await interaction.editReply({
      content: null,
      embeds: [embed],
      components: components,
    });

    // 儲存分頁資料
    if (totalPages > 1) {
      paginationData.set(reply.id, {
        meetings,
        filterType,
        currentPage,
        totalPages,
        userId: interaction.user.id,
      });

      // 30 分鐘後清除資料
      setTimeout(() => {
        paginationData.delete(reply.id);
      }, 30 * 60 * 1000);
    }
  } catch (error) {
    console.error('查詢會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '查詢失敗',
      '無法取得會議列表,請稍後再試'
    );
    await interaction.editReply({
      content: null,
      embeds: [errorEmbed],
      components: [],
    });
  }
}

/**
 * 處理分頁按鈕
 */
async function handlePaginationButton(interaction) {
  const data = paginationData.get(interaction.message.id);

  if (!data) {
    await interaction.reply({
      content: '❌ 分頁資料已過期,請重新查詢',
      ephemeral: true,
    });
    return;
  }

  // 檢查是否為原始使用者
  if (data.userId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ 只有查詢者可以操作分頁',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  // 更新頁碼
  if (interaction.customId === 'meeting_list_prev') {
    data.currentPage = Math.max(1, data.currentPage - 1);
  } else if (interaction.customId === 'meeting_list_next') {
    data.currentPage = Math.min(data.totalPages, data.currentPage + 1);
  }

  // 更新 Embed
  const embed = EmbedBuilderUtil.createMeetingListEmbed(
    data.meetings,
    data.filterType,
    data.currentPage,
    data.totalPages
  );

  const paginationButtons = createPaginationButtons(data.currentPage, data.totalPages);

  await interaction.editReply({
    embeds: [embed],
    components: [paginationButtons],
  });

  // 更新儲存的資料
  paginationData.set(interaction.message.id, data);
}

/**
 * 建立分頁按鈕
 */
function createPaginationButtons(currentPage, totalPages) {
  const prevButton = new ButtonBuilder()
    .setCustomId('meeting_list_prev')
    .setLabel('上一頁')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️')
    .setDisabled(currentPage === 1);

  const pageIndicator = new ButtonBuilder()
    .setCustomId('meeting_list_page_indicator')
    .setLabel(`${currentPage} / ${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId('meeting_list_next')
    .setLabel('下一頁')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('➡️')
    .setDisabled(currentPage === totalPages);

  return new ActionRowBuilder().addComponents(prevButton, pageIndicator, nextButton);
}

/**
 * 取得時間範圍
 */
function getTimeRange(filterType) {
  let timeMin, timeMax;

  switch (filterType) {
    case 'today':
      timeMin = dayjs().startOf('day').toISOString();
      timeMax = dayjs().endOf('day').toISOString();
      break;

    case 'this_week':
      timeMin = dayjs().startOf('isoWeek').toISOString();
      timeMax = dayjs().endOf('isoWeek').toISOString();
      break;

    case 'this_month':
      timeMin = dayjs().startOf('month').toISOString();
      timeMax = dayjs().endOf('month').toISOString();
      break;

    default:
      timeMin = dayjs().startOf('day').toISOString();
      timeMax = dayjs().endOf('day').toISOString();
  }

  return { timeMin, timeMax };
}

// 匯出處理函式
module.exports.handleFilterSelection = handleFilterSelection;
module.exports.handlePaginationButton = handlePaginationButton;
module.exports.paginationData = paginationData;
```

### Step 4: 更新 `src/events/interactionCreate.js`

在 `interactionCreate.js` 中新增 list-meetings 的互動處理:

```javascript
// 在現有的 interactionCreate.js 中新增以下處理

const listMeetingHandlers = require('../commands/list-meetings');

// 在 execute 函式中新增:

// 處理 list-meetings 選單
if (interaction.isStringSelectMenu()) {
  if (interaction.customId === 'meeting_list_filter') {
    await listMeetingHandlers.handleFilterSelection(interaction);
  }
  // ... 其他選單處理
}

// 處理 list-meetings 分頁按鈕
if (interaction.isButton()) {
  if (interaction.customId === 'meeting_list_prev' || interaction.customId === 'meeting_list_next') {
    await listMeetingHandlers.handlePaginationButton(interaction);
  }
  // ... 其他按鈕處理
}
```

### Step 5: 更新 Constants (`src/config/constants.js`)

新增顏色常數:

```javascript
module.exports = {
  // ... 現有的常數

  COLORS: {
    SUCCESS: 0x00ff00,    // 綠色 - 成功
    ERROR: 0xff0000,      // 紅色 - 錯誤
    WARNING: 0xffa500,    // 橘色 - 警告
    INFO: 0x0099ff,       // 藍色 - 資訊
    PRIMARY: 0x5865f2,    // Discord 紫色 - 主要
  },

  // ... 其他常數
};
```

### Step 6: 安裝必要套件

```bash
npm install dayjs
```

確保已安裝 `dayjs` 的 `isoWeek` plugin。

---

## 🔧 註冊斜線指令

執行註冊腳本更新指令:

```bash
node register-commands.js
```

---

## ✅ 測試檢查清單

### 基本功能測試
- [ ] `/list-meetings` 指令能正常觸發
- [ ] 篩選選單能正常顯示
- [ ] 選擇「今日」能正確顯示今日會議
- [ ] 選擇「本週」能正確顯示本週會議
- [ ] 選擇「本月」能正確顯示本月會議

### 分頁功能測試
- [ ] 會議超過 5 筆時顯示分頁按鈕
- [ ] 「上一頁」按鈕在第一頁時禁用
- [ ] 「下一頁」按鈕在最後一頁時禁用
- [ ] 頁碼指示器顯示正確
- [ ] 點擊分頁按鈕能正確切換頁面

### 顯示格式測試
- [ ] Embed 格式美觀
- [ ] 會議資訊顯示完整 (時間、類型、名稱、地點、參加者)
- [ ] 空會議列表顯示正確提示
- [ ] 會議 ID 正確顯示

### 錯誤處理測試
- [ ] Google Calendar API 錯誤時顯示錯誤訊息
- [ ] 分頁資料過期時提示重新查詢
- [ ] 非原始使用者操作分頁時提示錯誤

### 效能測試
- [ ] 查詢速度合理 (< 3 秒)
- [ ] 分頁資料 30 分鐘後自動清除
- [ ] 多個使用者同時查詢不會互相干擾

---

## 📝 實作檢查清單

- [ ] CalendarService 新增查詢方法
- [ ] EmbedBuilder 新增列表 Embed 方法
- [ ] /list-meetings 指令已實作
- [ ] 互動處理器已更新
- [ ] Constants 已更新顏色定義
- [ ] 指令已註冊到 Discord
- [ ] 所有功能已測試
- [ ] 提交變更: `git add . && git commit -m "feat: 完成 /list-meetings 指令"`
- [ ] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Discord.js Select Menus](https://discordjs.guide/interactions/select-menus.html)
- [Discord.js Buttons](https://discordjs.guide/interactions/buttons.html)
- [Day.js 文檔](https://day.js.org/)
- [Phase 1.3 - /add-meeting 指令](./03-add-meeting-command.md)
- [Phase 1.5 - 基本提醒功能](./05-basic-reminders.md)

---

## 💡 實作提示

### 分頁優化建議
- 考慮使用 Discord 的 Collector 來監聽按鈕互動
- 分頁資料可以儲存在 Redis 中以支援多伺服器部署
- 可以增加「跳轉到第 X 頁」的功能

### 顯示優化建議
- 可以使用不同顏色區分線上/線下會議
- 可以在會議時間前顯示倒數提示 (如「1 小時後」)
- 可以新增「匯出為日曆檔案」功能

### 效能優化建議
- 快取常用查詢結果 (如今日會議)
- 使用 partial response 減少 API 請求資料量
- 實作分頁預載入機制

---

**下一步**: 完成此功能後,繼續進行 [Phase 1.5 - 基本提醒功能](./05-basic-reminders.md)
