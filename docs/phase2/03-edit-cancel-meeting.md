# Phase 2.3 - 編輯/取消會議功能

> **功能編號**: P2-03
> **功能名稱**: 編輯、取消、查詢用戶會議功能
> **預估時間**: 5-6 小時
> **依賴項目**: P1-02 (Google Calendar API), P1-03 (/add-meeting 指令)
> **完成標準**: 使用者能編輯、取消會議,以及查詢特定用戶的會議列表

---

## 📋 功能概述

實作三個重要的會議管理指令:
1. `/edit-meeting` - 編輯現有會議
2. `/cancel-meeting` - 取消會議
3. `/user-meetings` - 查詢用戶會議

## 🎯 實作目標

- [ ] 實作 `/edit-meeting` 指令
- [ ] 實作 `/cancel-meeting` 指令
- [ ] 實作 `/user-meetings` 指令
- [ ] 實作權限檢查 (只能編輯/取消自己建立的會議)
- [ ] 實作取消確認對話框
- [ ] 整合布告欄即時更新

---

## 📦 所需檔案

```
src/
├── commands/
│   ├── edit-meeting.js       # 編輯會議指令
│   ├── cancel-meeting.js     # 取消會議指令
│   └── user-meetings.js      # 查詢用戶會議指令
├── services/
│   └── calendar.js           # Calendar 服務 (擴充)
└── utils/
    └── embed-builder.js      # Embed 訊息建構器 (擴充)
```

---

## 💻 實作步驟

### Step 1: 擴充 CalendarService (`src/services/calendar.js`)

新增編輯、刪除、查詢會議方法:

```javascript
// 在 CalendarService 類別中新增以下方法

/**
 * 取得單一會議
 * @param {string} eventId - 會議 ID
 * @returns {Object} - 會議資料
 */
async getMeeting(eventId) {
  try {
    const response = await this.calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
    });

    return this.parseMeetingEvent(response.data);
  } catch (error) {
    console.error('取得會議失敗:', error);
    throw new Error('找不到會議或會議已被刪除');
  }
}

/**
 * 更新會議
 * @param {string} eventId - 會議 ID
 * @param {Object} meetingData - 會議資料
 * @returns {Object} - 更新後的事件
 */
async updateMeeting(eventId, meetingData) {
  try {
    // 先取得現有會議
    const existingEvent = await this.calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
    });

    // 準備更新資料
    const startTime = dayjs(`${meetingData.date} ${meetingData.time}`);
    const endTime = startTime.add(2, 'hour');

    const updatedEvent = {
      summary: `[${meetingData.type}] ${meetingData.title}`,
      location: meetingData.location,
      description: this.formatDescription(meetingData),
      start: {
        dateTime: startTime.format(),
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: endTime.format(),
        timeZone: 'Asia/Taipei',
      },
      attendees: meetingData.participants.map(p => ({
        email: `user${p.user_id}@discord.bot`
      }))
    };

    const response = await this.calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
      resource: updatedEvent,
    });

    return response.data;
  } catch (error) {
    console.error('更新會議失敗:', error);
    throw error;
  }
}

/**
 * 刪除會議
 * @param {string} eventId - 會議 ID
 */
async deleteMeeting(eventId) {
  try {
    await this.calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
    });

    console.log(`[CalendarService] ✅ 已刪除會議: ${eventId}`);
  } catch (error) {
    console.error('刪除會議失敗:', error);
    throw new Error('無法刪除會議');
  }
}

/**
 * 查詢使用者參加的會議
 * @param {string} userId - Discord 用戶 ID
 * @param {string} timeMin - 開始時間
 * @param {string} timeMax - 結束時間
 * @returns {Array} - 會議列表
 */
async getUserMeetings(userId, timeMin, timeMax) {
  try {
    const allEvents = await this.listMeetings(timeMin, timeMax);
    const allMeetings = allEvents.map(event => this.parseMeetingEvent(event));

    // 篩選出使用者參加的會議
    const userMeetings = allMeetings.filter(meeting => {
      return meeting.participants.some(p => p.user_id === userId);
    });

    return userMeetings;
  } catch (error) {
    console.error('查詢使用者會議失敗:', error);
    throw error;
  }
}
```

### Step 2: 實作 /edit-meeting 指令 (`src/commands/edit-meeting.js`)

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
const dayjs = require('dayjs');

// 儲存編輯中的會議資料
const editingMeetings = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-meeting')
    .setDescription('編輯會議')
    .addStringOption(option =>
      option
        .setName('meeting_id')
        .setDescription('會議 ID')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const meetingId = interaction.options.getString('meeting_id');
    const calendarService = new CalendarService();

    try {
      // 取得會議資料
      const meeting = await calendarService.getMeeting(meetingId);

      // 檢查權限 (只有建立者可以編輯)
      if (meeting.discordInfo?.creator_id !== interaction.user.id) {
        await interaction.editReply({
          content: '❌ 你沒有權限編輯此會議 (只有建立者可以編輯)',
        });
        return;
      }

      // 儲存原始會議資料
      editingMeetings.set(interaction.user.id, {
        id: meetingId,
        original: meeting,
        guild_id: interaction.guildId,
        channel_id: interaction.channelId,
        creator_id: interaction.user.id,
      });

      // 顯示編輯表單 (與 add-meeting 相同)
      await showEditForm(interaction, meeting);
    } catch (error) {
      console.error('載入會議失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '載入會議失敗',
        error.message
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

/**
 * 顯示編輯表單
 */
async function showEditForm(interaction, meeting) {
  const startTime = dayjs(meeting.startTime);
  const meetingTypeValue = meeting.type === '線上會議' ? 'online' : 'offline';

  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId('edit_meeting_type')
    .setPlaceholder('選擇會議類型')
    .addOptions([
      { label: '線上會議', value: 'online', emoji: '💻', default: meetingTypeValue === 'online' },
      { label: '線下會議', value: 'offline', emoji: '🏢', default: meetingTypeValue === 'offline' },
    ]);

  const hourSelect = new StringSelectMenuBuilder()
    .setCustomId('edit_meeting_hour')
    .setPlaceholder(`選擇小時 (目前: ${startTime.format('HH')} 時)`)
    .addOptions(
      Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, '0')} 時`,
        value: i.toString(),
        default: i === startTime.hour(),
      }))
    );

  const minuteSelect = new StringSelectMenuBuilder()
    .setCustomId('edit_meeting_minute')
    .setPlaceholder(`選擇分鐘 (目前: ${startTime.format('mm')} 分)`)
    .addOptions([
      { label: '00 分', value: '0', default: startTime.minute() === 0 },
      { label: '15 分', value: '15', default: startTime.minute() === 15 },
      { label: '30 分', value: '30', default: startTime.minute() === 30 },
      { label: '45 分', value: '45', default: startTime.minute() === 45 },
    ]);

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId('edit_meeting_participants')
    .setPlaceholder('選擇參加者 (可複選)')
    .setMinValues(1)
    .setMaxValues(20);

  const nextButton = new ButtonBuilder()
    .setCustomId('edit_meeting_show_modal')
    .setLabel('下一步:填寫詳細資訊')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📝');

  await interaction.editReply({
    content: `📝 **編輯會議** - 請修改會議資訊:\n\n目前會議: **${meeting.title}**\n時間: ${startTime.format('YYYY-MM-DD HH:mm')}`,
    components: [
      new ActionRowBuilder().addComponents(typeSelect),
      new ActionRowBuilder().addComponents(hourSelect),
      new ActionRowBuilder().addComponents(minuteSelect),
      new ActionRowBuilder().addComponents(userSelect),
      new ActionRowBuilder().addComponents(nextButton),
    ],
  });
}

/**
 * 處理編輯表單提交
 */
async function handleEditModalSubmit(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期,請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  // 取得 Modal 輸入
  const date = Parser.parseDate(interaction.fields.getTextInputValue('meeting_date'));
  const title = interaction.fields.getTextInputValue('meeting_title');
  const location = interaction.fields.getTextInputValue('meeting_location');
  const content = interaction.fields.getTextInputValue('meeting_content');
  const time = `${(editData.hour || '0').padStart(2, '0')}:${(editData.minute || '0').padStart(2, '0')}`;

  const meetingData = {
    date,
    title,
    location,
    content,
    time,
    type: editData.type,
    participants: editData.participants,
    guild_id: editData.guild_id,
    channel_id: editData.channel_id,
    creator_id: editData.creator_id,
  };

  // 驗證資料
  const meetingErrors = Validator.validateMeeting(meetingData);
  const participantErrors = Validator.validateParticipants(meetingData.participants);
  const allErrors = [...meetingErrors, ...participantErrors];

  if (allErrors.length > 0) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('資料驗證失敗', allErrors);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const calendarService = new CalendarService();
    const event = await calendarService.updateMeeting(editData.id, meetingData);

    const confirmEmbed = EmbedBuilderUtil.createMeetingConfirmEmbed(meetingData, event);
    confirmEmbed.setTitle('✅ 會議更新成功');

    await interaction.editReply({ embeds: [confirmEmbed] });

    // 清除編輯資料
    editingMeetings.delete(userId);

    // 觸發布告欄更新
    if (interaction.client.scheduler) {
      await interaction.client.scheduler.triggerBoardUpdate();
    }
  } catch (error) {
    console.error('更新會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('更新會議失敗', error.message);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

// 匯出處理函式
module.exports.handleEditModalSubmit = handleEditModalSubmit;
module.exports.editingMeetings = editingMeetings;
```

### Step 3: 實作 /cancel-meeting 指令 (`src/commands/cancel-meeting.js`)

```javascript
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const CONSTANTS = require('../config/constants');
const dayjs = require('dayjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel-meeting')
    .setDescription('取消會議')
    .addStringOption(option =>
      option
        .setName('meeting_id')
        .setDescription('會議 ID')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const meetingId = interaction.options.getString('meeting_id');
    const calendarService = new CalendarService();

    try {
      // 取得會議資料
      const meeting = await calendarService.getMeeting(meetingId);

      // 檢查權限
      if (meeting.discordInfo?.creator_id !== interaction.user.id) {
        // 檢查是否為管理員
        if (!interaction.member.permissions.has('Administrator')) {
          await interaction.editReply({
            content: '❌ 你沒有權限取消此會議 (只有建立者或管理員可以取消)',
          });
          return;
        }
      }

      // 顯示確認對話框
      const startTime = dayjs(meeting.startTime);
      const endTime = dayjs(meeting.endTime);

      const confirmEmbed = new EmbedBuilder()
        .setColor(CONSTANTS.COLORS.WARNING)
        .setTitle('⚠️ 確認取消會議')
        .setDescription('你確定要取消以下會議嗎?此操作無法復原。')
        .addFields(
          { name: '📋 會議名稱', value: meeting.title, inline: false },
          { name: '📅 日期', value: startTime.format('YYYY-MM-DD'), inline: true },
          { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
          { name: '📍 地點', value: meeting.location, inline: true },
          { name: '👥 參加者', value: `${meeting.participants.length} 位`, inline: false }
        )
        .setTimestamp();

      const confirmButton = new ButtonBuilder()
        .setCustomId(`cancel_meeting_confirm_${meetingId}`)
        .setLabel('確認取消')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('✅');

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_meeting_abort')
        .setLabel('取消操作')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
      });
    } catch (error) {
      console.error('載入會議失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '載入會議失敗',
        error.message
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

/**
 * 處理取消會議確認
 */
async function handleCancelConfirm(interaction, meetingId) {
  await interaction.deferUpdate();

  try {
    const calendarService = new CalendarService();

    // 取得會議資料 (用於通知參加者)
    const meeting = await calendarService.getMeeting(meetingId);

    // 刪除會議
    await calendarService.deleteMeeting(meetingId);

    // 發送通知給所有參加者
    await notifyParticipants(interaction.client, meeting);

    const successEmbed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle('✅ 會議已取消')
      .setDescription(`已成功取消會議: **${meeting.title}**`)
      .addFields({
        name: '📢 通知',
        value: `已發送取消通知給 ${meeting.participants.length} 位參加者`,
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: [],
    });

    // 觸發布告欄更新
    if (interaction.client.scheduler) {
      await interaction.client.scheduler.triggerBoardUpdate();
    }
  } catch (error) {
    console.error('取消會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('取消會議失敗', error.message);
    await interaction.editReply({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

/**
 * 通知參加者會議已取消
 */
async function notifyParticipants(client, meeting) {
  const startTime = dayjs(meeting.startTime);

  const cancelEmbed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.ERROR)
    .setTitle('❌ 會議已取消')
    .setDescription('以下會議已被取消:')
    .addFields(
      { name: '📋 會議名稱', value: meeting.title, inline: false },
      { name: '📅 原定日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
      { name: '🕐 原定時間', value: startTime.format('HH:mm'), inline: true },
      { name: '📍 地點', value: meeting.location, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Meeting Bot 通知' });

  let successCount = 0;
  let failCount = 0;

  for (const participant of meeting.participants) {
    try {
      const user = await client.users.fetch(participant.user_id);
      await user.send({ embeds: [cancelEmbed] });
      successCount++;
      console.log(`[CancelMeeting] ✅ 已通知 ${participant.name}`);

      // 延遲避免 Rate Limit
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failCount++;
      console.error(`[CancelMeeting] ❌ 無法通知 ${participant.name}:`, error.message);
    }
  }

  console.log(`[CancelMeeting] 通知發送完成: 成功 ${successCount}, 失敗 ${failCount}`);
}

// 匯出處理函式
module.exports.handleCancelConfirm = handleCancelConfirm;
```

### Step 4: 實作 /user-meetings 指令 (`src/commands/user-meetings.js`)

```javascript
const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const CalendarService = require('../services/calendar');
const EmbedBuilderUtil = require('../utils/embed-builder');
const CONSTANTS = require('../config/constants');
const dayjs = require('dayjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-meetings')
    .setDescription('查詢用戶的會議')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('要查詢的用戶 (留空查詢自己)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 取得目標用戶 (預設為自己)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const calendarService = new CalendarService();

    try {
      // 查詢未來 30 天的會議
      const timeMin = dayjs().startOf('day').toISOString();
      const timeMax = dayjs().add(30, 'day').endOf('day').toISOString();

      const meetings = await calendarService.getUserMeetings(targetUser.id, timeMin, timeMax);

      if (meetings.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(CONSTANTS.COLORS.INFO)
          .setTitle(`📅 ${targetUser.username} 的會議`)
          .setDescription('未來 30 天沒有會議')
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp();

        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      // 建立會議列表 Embed
      const embed = new EmbedBuilder()
        .setColor(CONSTANTS.COLORS.PRIMARY)
        .setTitle(`📅 ${targetUser.username} 的會議`)
        .setDescription(`未來 30 天共有 ${meetings.length} 場會議`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // 按時間排序
      const sortedMeetings = meetings.sort((a, b) => {
        return dayjs(a.startTime).isBefore(dayjs(b.startTime)) ? -1 : 1;
      });

      // 只顯示前 10 個會議
      const displayMeetings = sortedMeetings.slice(0, 10);

      let description = '';

      for (const meeting of displayMeetings) {
        const startTime = dayjs(meeting.startTime);
        const endTime = dayjs(meeting.endTime);
        const isPast = dayjs().isAfter(endTime);
        const statusEmoji = isPast ? '✅' : '📌';

        description += `\n${statusEmoji} **${startTime.format('MM/DD HH:mm')}** | ${meeting.type}\n`;
        description += `📋 ${meeting.title}\n`;
        description += `📍 ${meeting.location}\n`;
        description += `🆔 \`${meeting.id}\`\n`;
        description += `─────────────────\n`;
      }

      embed.setDescription(`未來 30 天共有 ${meetings.length} 場會議\n${description}`);

      if (meetings.length > 10) {
        embed.setFooter({ text: `僅顯示前 10 場會議 • 共 ${meetings.length} 場 • Meeting Bot` });
      } else {
        embed.setFooter({ text: 'Meeting Bot' });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('查詢用戶會議失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '查詢失敗',
        '無法取得用戶會議,請稍後再試'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
```

### Step 5: 更新 `src/events/interactionCreate.js`

新增 edit-meeting 和 cancel-meeting 的互動處理:

```javascript
// 在現有的 interactionCreate.js 中新增

const editMeetingHandlers = require('../commands/edit-meeting');
const cancelMeetingHandlers = require('../commands/cancel-meeting');

// 在 execute 函式中新增:

// 處理 edit-meeting 的選單和 Modal
if (interaction.isStringSelectMenu()) {
  if (interaction.customId.startsWith('edit_meeting_')) {
    // 與 add-meeting 類似的處理邏輯
    // ... (參考 add-meeting 的處理方式)
  }
}

if (interaction.isModalSubmit()) {
  if (interaction.customId === 'edit_meeting_details_modal') {
    await editMeetingHandlers.handleEditModalSubmit(interaction);
  }
}

// 處理 cancel-meeting 的按鈕
if (interaction.isButton()) {
  if (interaction.customId.startsWith('cancel_meeting_confirm_')) {
    const meetingId = interaction.customId.replace('cancel_meeting_confirm_', '');
    await cancelMeetingHandlers.handleCancelConfirm(interaction, meetingId);
  } else if (interaction.customId === 'cancel_meeting_abort') {
    await interaction.update({
      content: '❌ 已取消操作',
      embeds: [],
      components: [],
    });
  }
}
```

---

## ✅ 測試檢查清單

### /edit-meeting 測試
- [ ] 指令能正常觸發
- [ ] 能正確載入現有會議資料
- [ ] 表單預填現有資料
- [ ] 權限檢查正常 (只有建立者可編輯)
- [ ] 會議更新成功
- [ ] 布告欄即時更新

### /cancel-meeting 測試
- [ ] 指令能正常觸發
- [ ] 顯示取消確認對話框
- [ ] 權限檢查正常 (建立者或管理員)
- [ ] 確認按鈕正常運作
- [ ] 取消操作按鈕正常運作
- [ ] 會議刪除成功
- [ ] 參加者收到取消通知
- [ ] 布告欄即時更新

### /user-meetings 測試
- [ ] 指令能正常觸發
- [ ] 查詢自己的會議正常
- [ ] 查詢他人的會議正常
- [ ] 空會議列表顯示正確
- [ ] 會議列表顯示格式正確
- [ ] 只顯示未來會議
- [ ] 會議按時間排序

### 錯誤處理測試
- [ ] 會議 ID 不存在時的處理
- [ ] 權限不足時的提示
- [ ] Google Calendar API 錯誤處理
- [ ] DM 發送失敗時的處理

---

## 📝 實作檢查清單

- [ ] CalendarService 新增編輯、刪除、查詢方法
- [ ] /edit-meeting 指令已實作
- [ ] /cancel-meeting 指令已實作
- [ ] /user-meetings 指令已實作
- [ ] 互動處理器已更新
- [ ] 權限檢查已實作
- [ ] 取消通知已實作
- [ ] 所有功能已測試
- [ ] 指令已註冊: `node register-commands.js`
- [ ] 提交變更: `git add . && git commit -m "feat: 完成編輯/取消/查詢會議功能"`
- [ ] 推送到 GitHub: `git push origin main`

---

## 🔗 相關文件

- [Discord.js Modals](https://discordjs.guide/interactions/modals.html)
- [Discord.js Buttons](https://discordjs.guide/interactions/buttons.html)
- [Google Calendar API - Update Event](https://developers.google.com/calendar/api/v3/reference/events/update)
- [Google Calendar API - Delete Event](https://developers.google.com/calendar/api/v3/reference/events/delete)
- [Phase 1.3 - /add-meeting 指令](../phase1/03-add-meeting-command.md)
- [Phase 2.2 - 多時段提醒](./02-multi-reminders.md)

---

## 💡 實作提示

### 編輯功能優化建議
- 新增「複製會議」功能
- 支援批量編輯多個會議
- 新增編輯歷史記錄
- 實作 Undo/Redo 功能

### 取消功能優化建議
- 新增取消原因輸入
- 支援「延期」而非完全取消
- 新增自動重排會議功能
- 實作取消會議的統計分析

### 查詢功能優化建議
- 新增日期範圍篩選
- 支援會議類型篩選
- 新增匯出功能 (ICS 檔案)
- 實作會議搜尋功能

### 權限管理建議
- 實作會議共同編輯者機制
- 新增角色權限控制
- 實作會議審核流程
- 新增操作日誌記錄

### 通知優化建議
- 自訂通知訊息內容
- 支援不同通知方式 (DM/頻道/Email)
- 新增通知偏好設定
- 實作通知確認機制

### 使用者體驗優化
- 新增快速操作選單
- 實作拖拽式時間調整
- 新增會議範本功能
- 實作智能建議功能

---

**恭喜!** 完成此功能後,Phase 2 的所有核心功能都已實作完成。接下來可以進行:
- 系統測試與優化
- 文檔完善
- 部署到 Zeabur
- 持續改進與新功能開發
