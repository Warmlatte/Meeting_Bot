import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import CalendarService from '../services/calendar.js';
import Parser from '../services/parser.js';
import Validator from '../utils/validator.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import CONSTANTS from '../config/constants.js';

// 儲存臨時會議資料 (使用 Map,key 為 userId)
export const tempMeetingData = new Map();

export default {
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
export async function handleTypeSelection(interaction) {
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
export async function handleTimeSelection(interaction) {
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
export async function handleParticipantsSelection(interaction) {
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
export async function showDetailsModal(interaction) {
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
export async function handleModalSubmit(interaction) {
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
export async function createMeeting(interaction, data) {
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
