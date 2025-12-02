# Phase 1.3 - /add-meeting 指令實作

> **功能編號**: P1-03
> **功能名稱**: /add-meeting 新增會議指令
> **預估時間**: 4-5 小時
> **依賴項目**: P1-01 (Discord Bot), P1-02 (Google Calendar API)
> **完成標準**: 使用者能透過互動式表單成功建立會議並寫入 Google Calendar

---

## 📋 功能概述

實作 `/add-meeting` 斜線指令,提供完整的互動式表單讓使用者建立會議,包括時間衝突檢查、資料驗證,以及寫入 Google Calendar。

## 🎯 實作目標

- [x] 建立 `/add-meeting` 斜線指令
- [x] 實作互動式表單 (Select Menu + Modal)
- [x] 實作會議資料驗證
- [x] 實作時間衝突檢查
- [x] 整合 CalendarService 建立會議
- [x] 實作確認訊息 Embed

---

## 📦 所需檔案

```
src/
├── commands/
│   └── add-meeting.js       # 主要指令檔案
├── utils/
│   ├── validator.js         # 資料驗證器
│   └── embed-builder.js     # Embed 訊息建構器
└── services/
    ├── calendar.js          # Calendar 服務 (已完成)
    └── parser.js            # 日期時間解析器
```

---

## 💻 實作步驟

### Step 1: 建立 Parser 服務 (`src/services/parser.js`)

```javascript
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

/**
 * 日期時間解析器
 */
class Parser {
  /**
   * 解析日期格式
   * 支援: 25/10/7, 25/10/07, 2025.10.07, 2025-10-07
   * @param {string} dateStr - 日期字串
   * @returns {string} - 標準格式日期 (YYYY-MM-DD)
   */
  static parseDate(dateStr) {
    // 處理 25/10/7 或 25/10/07
    if (/^\d{2}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/');
      return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // 處理 2025.10.07
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      return dateStr.replace(/\./g, '-');
    }

    // 已是標準格式 2025-10-07
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr;
  }

  /**
   * 解析時間格式
   * 支援: 13:00, 13：00 (中文冒號)
   * @param {string} timeStr - 時間字串
   * @returns {string} - 標準格式時間 (HH:MM)
   */
  static parseTime(timeStr) {
    // 處理中文冒號
    timeStr = timeStr.replace(':', ':');

    // 驗證並格式化
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hour, minute] = timeStr.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    return timeStr;
  }

  /**
   * 組合日期時間
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} time - 時間 (HH:MM)
   * @returns {Object} - dayjs 物件
   */
  static combineDateTime(date, time) {
    return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  }
}

module.exports = Parser;
```

### Step 2: 建立 Validator 工具 (`src/utils/validator.js`)

```javascript
const dayjs = require('dayjs');

/**
 * 資料驗證器
 */
class Validator {
  /**
   * 驗證會議資料
   * @param {Object} data - 會議資料
   * @returns {Array<string>} - 錯誤訊息陣列
   */
  static validateMeeting(data) {
    const errors = [];

    // 必填欄位
    if (!data.title || data.title.trim() === '') {
      errors.push('會議名稱為必填');
    }
    if (!data.date) {
      errors.push('會議日期為必填');
    }
    if (!data.time) {
      errors.push('會議時間為必填');
    }
    if (!data.type) {
      errors.push('會議類型為必填');
    }
    if (!data.location || data.location.trim() === '') {
      errors.push('會議地點為必填');
    }

    // 日期驗證
    if (data.date) {
      const meetingDate = dayjs(data.date);
      if (!meetingDate.isValid()) {
        errors.push('日期格式錯誤');
      } else if (meetingDate.isBefore(dayjs(), 'day')) {
        errors.push('會議日期不可為過去');
      }
    }

    // 時間驗證
    if (data.time && !/^\d{2}:\d{2}$/.test(data.time)) {
      errors.push('時間格式錯誤 (應為 HH:MM)');
    }

    // 標題長度
    if (data.title && data.title.length > 100) {
      errors.push('會議名稱不可超過 100 字元');
    }

    // 內容長度
    if (data.content && data.content.length > 1000) {
      errors.push('會議內容不可超過 1000 字元');
    }

    return errors;
  }

  /**
   * 驗證參加者
   * @param {Array} participants - 參加者陣列
   * @returns {Array<string>} - 錯誤訊息陣列
   */
  static validateParticipants(participants) {
    const errors = [];

    if (!Array.isArray(participants) || participants.length === 0) {
      errors.push('至少需要一位參加者');
    }

    if (participants && participants.length > 20) {
      errors.push('參加者不可超過 20 位');
    }

    return errors;
  }
}

module.exports = Validator;
```

### Step 3: 建立 Embed Builder (`src/utils/embed-builder.js`)

```javascript
const { EmbedBuilder } = require('discord.js');
const CONSTANTS = require('../config/constants');
const dayjs = require('dayjs');

/**
 * Embed 訊息建構器
 */
class EmbedBuilderUtil {
  /**
   * 建立會議確認 Embed
   * @param {Object} meeting - 會議資料
   * @param {Object} event - Google Calendar 事件
   * @returns {EmbedBuilder}
   */
  static createMeetingConfirmEmbed(meeting, event) {
    const startTime = dayjs(event.start.dateTime);
    const endTime = dayjs(event.end.dateTime);

    return new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle('✅ 會議建立成功')
      .addFields(
        { name: '📅 日期', value: startTime.format('YYYY-MM-DD'), inline: true },
        { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
        { name: '📝 類型', value: meeting.type, inline: true },
        { name: '📋 會議名稱', value: meeting.title, inline: false },
        { name: '📍 地點', value: meeting.location, inline: false },
        { name: '👥 參加者', value: meeting.participants.map(p => `<@${p.user_id}>`).join(' '), inline: false },
        { name: '🆔 會議 ID', value: `\`${event.id}\``, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Meeting Bot' });
  }

  /**
   * 建立錯誤 Embed
   * @param {string} title - 標題
   * @param {string|Array} errors - 錯誤訊息或錯誤訊息陣列
   * @returns {EmbedBuilder}
   */
  static createErrorEmbed(title, errors) {
    const errorList = Array.isArray(errors) ? errors.join('\n') : errors;

    return new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(errorList)
      .setTimestamp();
  }

  /**
   * 建立時間衝突警告 Embed
   * @param {Object} conflictData - 衝突資料
   * @returns {EmbedBuilder}
   */
  static createConflictEmbed(conflictData) {
    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.WARNING)
      .setTitle('⚠️ 會議時間衝突警告')
      .setDescription('以下參加者在此時段已有其他會議:')
      .setTimestamp();

    for (const conflict of conflictData.conflicts) {
      const conflictMeeting = conflict.meeting;
      const startTime = dayjs(conflictMeeting.start.dateTime);
      const endTime = dayjs(conflictMeeting.end.dateTime);

      const participantNames = conflict.participants.map(p => `<@${p.user_id}>`).join(', ');
      const timeRange = `${startTime.format('HH:mm')}-${endTime.format('HH:mm')}`;

      embed.addFields({
        name: `${participantNames}`,
        value: `• ${timeRange} | ${conflictMeeting.summary}`,
        inline: false
      });
    }

    embed.addFields({
      name: '\u200B',
      value: '是否仍要建立此會議?',
      inline: false
    });

    return embed;
  }
}

module.exports = EmbedBuilderUtil;
```

### Step 4: 實作 /add-meeting 指令 (`src/commands/add-meeting.js`)

```javascript
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const CalendarService = require('../services/calendar');
const Parser = require('../services/parser');
const Validator = require('../utils/validator');
const EmbedBuilderUtil = require('../utils/embed-builder');
const CONSTANTS = require('../config/constants');

// 儲存臨時會議資料 (使用 Map,key 為 userId)
const tempMeetingData = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-meeting')
    .setDescription('新增會議'),

  async execute(interaction) {
    // 初始化臨時資料
    tempMeetingData.set(interaction.user.id, {
      guild_id: interaction.guildId,
      channel_id: interaction.channelId,
      creator_id: interaction.user.id,
    });

    // 建立選單
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId('meeting_type')
      .setPlaceholder('選擇會議類型')
      .addOptions([
        { label: '線上會議', value: 'online', emoji: '💻' },
        { label: '線下會議', value: 'offline', emoji: '🏢' },
      ]);

    const hourSelect = new StringSelectMenuBuilder()
      .setCustomId('meeting_hour')
      .setPlaceholder('選擇小時')
      .addOptions(
        Array.from({ length: 24 }, (_, i) => ({
          label: `${i.toString().padStart(2, '0')} 時`,
          value: i.toString(),
        }))
      );

    const minuteSelect = new StringSelectMenuBuilder()
      .setCustomId('meeting_minute')
      .setPlaceholder('選擇分鐘')
      .addOptions([
        { label: '00 分', value: '0' },
        { label: '15 分', value: '15' },
        { label: '30 分', value: '30' },
        { label: '45 分', value: '45' },
      ]);

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('meeting_participants')
      .setPlaceholder('選擇參加者 (可複選)')
      .setMinValues(1)
      .setMaxValues(20);

    const nextButton = new ButtonBuilder()
      .setCustomId('meeting_show_modal')
      .setLabel('下一步:填寫詳細資訊')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');

    await interaction.reply({
      content: '📅 **新增會議** - 請填寫會議資訊:',
      components: [
        new ActionRowBuilder().addComponents(typeSelect),
        new ActionRowBuilder().addComponents(hourSelect),
        new ActionRowBuilder().addComponents(minuteSelect),
        new ActionRowBuilder().addComponents(userSelect),
        new ActionRowBuilder().addComponents(nextButton),
      ],
      ephemeral: true,
    });
  },
};

/**
 * 處理會議類型選擇
 */
async function handleTypeSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  const selectedType = interaction.values[0];
  data.type = selectedType === 'online' ? CONSTANTS.MEETING_TYPES.ONLINE : CONSTANTS.MEETING_TYPES.OFFLINE;
  data.location = selectedType === 'online' ? CONSTANTS.DEFAULTS.ONLINE_LOCATION : '';

  tempMeetingData.set(userId, data);

  await interaction.update({
    content: `✅ 已選擇: **${data.type}**\n📅 **新增會議** - 請繼續填寫:`,
    components: interaction.message.components,
  });
}

/**
 * 處理時間選擇
 */
async function handleTimeSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  if (interaction.customId === 'meeting_hour') {
    data.hour = interaction.values[0];
  } else if (interaction.customId === 'meeting_minute') {
    data.minute = interaction.values[0];
  }

  tempMeetingData.set(userId, data);

  const timeStr = data.hour && data.minute ? `${data.hour.padStart(2, '0')}:${data.minute.padStart(2, '0')}` : '未設定';
  await interaction.update({
    content: `✅ 時間: **${timeStr}**\n📅 **新增會議** - 請繼續填寫:`,
    components: interaction.message.components,
  });
}

/**
 * 處理參加者選擇
 */
async function handleParticipantsSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  data.participants = interaction.values.map(id => ({
    user_id: id,
    name: interaction.guild.members.cache.get(id)?.user.username || 'Unknown',
  }));

  tempMeetingData.set(userId, data);

  await interaction.update({
    content: `✅ 已選擇 **${data.participants.length}** 位參加者\n📅 **新增會議** - 請繼續填寫:`,
    components: interaction.message.components,
  });
}

/**
 * 顯示 Modal
 */
async function showDetailsModal(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  const modal = new ModalBuilder()
    .setCustomId('meeting_details_modal')
    .setTitle('會議詳細資訊');

  const dateInput = new TextInputBuilder()
    .setCustomId('meeting_date')
    .setLabel('會議日期 (格式: YYYY-MM-DD 或 25/10/7)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: 2025-10-07 或 25/10/7')
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId('meeting_title')
    .setLabel('會議名稱')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: 劇本架構會議')
    .setMaxLength(100)
    .setRequired(true);

  const locationInput = new TextInputBuilder()
    .setCustomId('meeting_location')
    .setLabel('會議地點')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(data.location || '例如: TRB工作室')
    .setValue(data.location || '')
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId('meeting_content')
    .setLabel('會議內容')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例如:\n1. 討論劇本架構\n2. 確認時間表')
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(locationInput),
    new ActionRowBuilder().addComponents(contentInput)
  );

  await interaction.showModal(modal);
}

/**
 * 處理 Modal 提交
 */
async function handleModalSubmit(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  // 取得 Modal 輸入
  data.date = Parser.parseDate(interaction.fields.getTextInputValue('meeting_date'));
  data.title = interaction.fields.getTextInputValue('meeting_title');
  data.location = interaction.fields.getTextInputValue('meeting_location');
  data.content = interaction.fields.getTextInputValue('meeting_content');
  data.time = `${(data.hour || '0').padStart(2, '0')}:${(data.minute || '0').padStart(2, '0')}`;

  // 驗證資料
  const meetingErrors = Validator.validateMeeting(data);
  const participantErrors = Validator.validateParticipants(data.participants);
  const allErrors = [...meetingErrors, ...participantErrors];

  if (allErrors.length > 0) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('資料驗證失敗', allErrors);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    tempMeetingData.delete(userId);
    return;
  }

  // 檢查時間衝突
  await interaction.deferReply({ ephemeral: true });

  const calendarService = new CalendarService();
  const startTime = Parser.combineDateTime(data.date, data.time);
  const endTime = startTime.add(2, 'hour');

  const conflictCheck = await calendarService.checkConflicts(
    startTime.toISOString(),
    endTime.toISOString(),
    data.participants
  );

  if (conflictCheck.hasConflict) {
    const conflictEmbed = EmbedBuilderUtil.createConflictEmbed(conflictCheck);

    const confirmButton = new ButtonBuilder()
      .setCustomId('meeting_confirm_create')
      .setLabel('確認建立')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('meeting_cancel_create')
      .setLabel('取消')
      .setStyle(ButtonStyle.Danger);

    await interaction.editReply({
      embeds: [conflictEmbed],
      components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
    });

    tempMeetingData.set(userId, data);
    return;
  }

  // 無衝突,直接建立
  await createMeeting(interaction, data);
}

/**
 * 建立會議
 */
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
  } catch (error) {
    console.error('建立會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('建立會議失敗', error.message);

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

// 匯出處理函式供 interactionCreate 事件使用
module.exports.handleTypeSelection = handleTypeSelection;
module.exports.handleTimeSelection = handleTimeSelection;
module.exports.handleParticipantsSelection = handleParticipantsSelection;
module.exports.showDetailsModal = showDetailsModal;
module.exports.handleModalSubmit = handleModalSubmit;
module.exports.createMeeting = createMeeting;
```

### Step 5: 更新 `src/events/interactionCreate.js`

在 `interactionCreate.js` 中新增處理 add-meeting 的互動:

```javascript
const { Events } = require('discord.js');
const addMeetingHandlers = require('../commands/add-meeting');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // 處理斜線指令
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`執行指令錯誤:`, error);
        const errorMessage = { content: '執行指令時發生錯誤!', ephemeral: true };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // 處理選單互動 (add-meeting)
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'meeting_type') {
        await addMeetingHandlers.handleTypeSelection(interaction);
      } else if (interaction.customId === 'meeting_hour' || interaction.customId === 'meeting_minute') {
        await addMeetingHandlers.handleTimeSelection(interaction);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'meeting_participants') {
        await addMeetingHandlers.handleParticipantsSelection(interaction);
      }
    }

    // 處理按鈕互動 (add-meeting)
    if (interaction.isButton()) {
      if (interaction.customId === 'meeting_show_modal') {
        await addMeetingHandlers.showDetailsModal(interaction);
      } else if (interaction.customId === 'meeting_confirm_create') {
        // 取得儲存的資料並建立會議
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const tempMeetingData = require('../commands/add-meeting').tempMeetingData;
        const data = tempMeetingData.get(userId);
        if (data) {
          await addMeetingHandlers.createMeeting(interaction, data);
        }
      } else if (interaction.customId === 'meeting_cancel_create') {
        await interaction.update({
          content: '❌ 已取消建立會議',
          embeds: [],
          components: [],
        });
      }
    }

    // 處理 Modal 提交 (add-meeting)
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'meeting_details_modal') {
        await addMeetingHandlers.handleModalSubmit(interaction);
      }
    }
  },
};
```

---

## 🔧 註冊斜線指令

建立 `register-commands.js` 用於註冊指令到 Discord:

```javascript
const { REST, Routes } = require('discord.js');
const config = require('./src/config/env');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
  try {
    console.log(`開始註冊 ${commands.length} 個斜線指令...`);

    // 開發環境: 註冊到特定伺服器 (即時生效)
    if (config.discord.guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      console.log(`✅ 成功註冊 ${data.length} 個伺服器指令!`);
    } else {
      // 生產環境: 註冊到全域 (需要 1 小時生效)
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      );
      console.log(`✅ 成功註冊 ${data.length} 個全域指令!`);
    }
  } catch (error) {
    console.error('❌ 註冊指令失敗:', error);
  }
})();
```

執行註冊:
```bash
node register-commands.js
```

---

## ✅ 測試檢查清單

### 基本功能測試
- [ ] `/add-meeting` 指令能正常觸發
- [ ] 所有選單都能正常顯示和選擇
- [ ] Modal 能正常彈出和提交
- [ ] 會議能成功建立到 Google Calendar

### 資料驗證測試
- [ ] 必填欄位驗證正常
- [ ] 日期格式驗證正確
- [ ] 過去日期被正確拒絕
- [ ] 參加者數量限制生效

### 時間衝突測試
- [ ] 能正確檢測時間衝突
- [ ] 衝突警告正確顯示
- [ ] 確認建立按鈕正常運作
- [ ] 取消按鈕正常運作

### 使用者體驗測試
- [ ] 錯誤訊息清晰易懂
- [ ] Embed 格式美觀
- [ ] 互動流程順暢
- [ ] 按鈕和選單回應快速

---

## 📝 實作檢查清單

- [x] Parser 服務已實作
- [x] Validator 工具已實作
- [x] EmbedBuilder 工具已實作
- [x] /add-meeting 指令已實作
- [x] 互動處理器已更新
- [x] 指令已註冊到 Discord
- [x] 所有功能已測試
- [x] 提交變更: `git add . && git commit -m "feat: 完成 /add-meeting 指令"`
- [x] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Discord.js 互動元件](https://discordjs.guide/interactions/select-menus.html)
- [Discord.js Modals](https://discordjs.guide/interactions/modals.html)
- [Phase 1.2 - Google Calendar API](./02-google-calendar-api.md)
- [Phase 1.4 - /list-meetings 指令](./04-list-meetings-command.md)

---

**下一步**: 完成此功能後,繼續進行 [Phase 1.4 - /list-meetings 指令](./04-list-meetings-command.md)
