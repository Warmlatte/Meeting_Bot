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
  EmbedBuilder,
} from 'discord.js';
import CalendarService from '../services/calendar.js';
import Parser from '../services/parser.js';
import Validator from '../utils/validator.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import CONSTANTS from '../config/constants.js';
import { getRandomMeetingEditSuccessImage } from '../config/images.js';
import { createDate } from '../utils/date-utils.js';

// 儲存編輯中的會議資料
export const editingMeetings = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('edit-meeting')
    .setDescription('編輯會議')
    .addStringOption(option =>
      option
        .setName('meeting_id')
        .setDescription('會議 ID (從 /user-meetings 或 /list-meetings 取得)')
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
        // 檢查是否為管理員
        if (!interaction.member.permissions.has('Administrator')) {
          const errorEmbed = new EmbedBuilder()
            .setColor(CONSTANTS.COLORS.ERROR)
            .setTitle('❌ 權限不足')
            .setDescription('你沒有權限編輯此會議')
            .addFields(
              { name: '說明', value: '只有會議建立者或伺服器管理員可以編輯會議', inline: false },
              { name: '建立者', value: `<@${meeting.discordInfo?.creator_id || '未知'}>`, inline: true },
              { name: '你的身份', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }
      }

      // 儲存原始會議資料
      editingMeetings.set(interaction.user.id, {
        id: meetingId,
        original: meeting,
        guild_id: interaction.guildId,
        channel_id: interaction.channelId,
        creator_id: meeting.discordInfo?.creator_id || interaction.user.id,
      });

      // 顯示編輯表單
      await showEditForm(interaction, meeting);
    } catch (error) {
      console.error('❌ 載入會議失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '載入會議失敗',
        error.message || '找不到會議或會議已被刪除'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

/**
 * 顯示編輯表單
 */
async function showEditForm(interaction, meeting) {
  const startTime = createDate(meeting.startTime);
  const endTime = createDate(meeting.endTime);
  const durationHours = endTime.diff(startTime, 'hour', true);
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
    .setLabel('下一步: 填寫詳細資訊')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📝');

  const cancelButton = new ButtonBuilder()
    .setCustomId('edit_meeting_cancel')
    .setLabel('取消編輯')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const currentEmbed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.PRIMARY)
    .setTitle('📝 編輯會議')
    .setDescription('請修改會議資訊')
    .addFields(
      { name: '📋 目前會議', value: meeting.title || '未設定', inline: false },
      { name: '📅 目前日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
      { name: '🕐 目前時間', value: startTime.format('HH:mm'), inline: true },
      { name: '⏱️ 目前時長', value: `${durationHours} 小時`, inline: true },
      { name: '📍 目前地點', value: meeting.location || '未設定', inline: true },
      { name: '👥 目前參加者', value: `${meeting.participants?.length || 0} 人`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [currentEmbed],
    components: [
      new ActionRowBuilder().addComponents(typeSelect),
      new ActionRowBuilder().addComponents(hourSelect),
      new ActionRowBuilder().addComponents(minuteSelect),
      new ActionRowBuilder().addComponents(userSelect),
      new ActionRowBuilder().addComponents(nextButton, cancelButton),
    ],
  });
}

/**
 * 處理會議類型選擇
 */
export async function handleTypeSelection(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  const type = interaction.values[0] === 'online' ? '線上會議' : '線下會議';
  editData.type = type;
  editingMeetings.set(userId, editData);

  await interaction.deferUpdate();
}

/**
 * 處理小時選擇
 */
export async function handleHourSelection(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  editData.hour = interaction.values[0];
  editingMeetings.set(userId, editData);

  await interaction.deferUpdate();
}

/**
 * 處理分鐘選擇
 */
export async function handleMinuteSelection(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  editData.minute = interaction.values[0];
  editingMeetings.set(userId, editData);

  await interaction.deferUpdate();
}

/**
 * 處理參加者選擇
 */
export async function handleParticipantsSelection(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  const participants = interaction.users.map(user => ({
    name: user.username,
    user_id: user.id,
  }));

  editData.participants = participants;
  editingMeetings.set(userId, editData);

  await interaction.deferUpdate();
}

/**
 * 顯示詳細資訊 Modal
 */
export async function showDetailsModal(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  const meeting = editData.original;
  const startTime = createDate(meeting.startTime);
  const endTime = createDate(meeting.endTime);
  const durationHours = endTime.diff(startTime, 'hour', true);

  const modal = new ModalBuilder()
    .setCustomId('edit_meeting_details_modal')
    .setTitle('編輯會議詳細資訊');

  const dateInput = new TextInputBuilder()
    .setCustomId('meeting_date')
    .setLabel('會議日期')
    .setPlaceholder('例如: 2025-01-15 或 25/1/15')
    .setStyle(TextInputStyle.Short)
    .setValue(startTime.format('YYYY-MM-DD'))
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId('meeting_title')
    .setLabel('會議名稱')
    .setPlaceholder('例如: 專案討論會議')
    .setStyle(TextInputStyle.Short)
    .setValue(meeting.title || '')
    .setMaxLength(100)
    .setRequired(true);

  const locationInput = new TextInputBuilder()
    .setCustomId('meeting_location')
    .setLabel('會議地點')
    .setPlaceholder('例如: Discord 語音頻道 或 會議室 A')
    .setStyle(TextInputStyle.Short)
    .setValue(meeting.location || '')
    .setMaxLength(100)
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId('meeting_content')
    .setLabel('會議內容')
    .setPlaceholder('例如:\n1. 討論專案進度\n2. 確認下一步計畫\n3. Q&A')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(meeting.content || '')
    .setMaxLength(1000)
    .setRequired(false);

  const durationInput = new TextInputBuilder()
    .setCustomId('meeting_duration')
    .setLabel('會議時長 (小時)')
    .setPlaceholder('例如: 2 或 1.5')
    .setStyle(TextInputStyle.Short)
    .setValue(durationHours.toString())
    .setMaxLength(4)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(locationInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(contentInput)
  );

  await interaction.showModal(modal);
}

/**
 * 處理編輯表單提交
 */
export async function handleModalSubmit(interaction) {
  const userId = interaction.user.id;
  const editData = editingMeetings.get(userId);

  if (!editData) {
    await interaction.reply({
      content: '❌ 編輯資料已過期，請重新執行 /edit-meeting',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // 取得 Modal 輸入
    const dateInput = interaction.fields.getTextInputValue('meeting_date');
    const date = Parser.parseDate(dateInput);
    const title = interaction.fields.getTextInputValue('meeting_title');
    const location = interaction.fields.getTextInputValue('meeting_location');
    const content = interaction.fields.getTextInputValue('meeting_content');
    const durationInput = interaction.fields.getTextInputValue('meeting_duration');
    const duration = parseFloat(durationInput) || 2;

    // 組合時間
    const hour = editData.hour || createDate(editData.original.startTime).hour().toString();
    const minute = editData.minute || createDate(editData.original.startTime).minute().toString();
    const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    const meetingData = {
      date,
      title,
      location,
      content,
      time,
      duration,
      type: editData.type || editData.original.type,
      participants: editData.participants || editData.original.participants,
      guild_id: editData.guild_id,
      channel_id: editData.channel_id,
      creator_id: editData.creator_id,
    };

    // 驗證資料
    const meetingErrors = Validator.validateMeeting(meetingData);
    const participantErrors = Validator.validateParticipants(meetingData.participants);
    const allErrors = [...meetingErrors, ...participantErrors];

    if (allErrors.length > 0) {
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed('資料驗證失敗', allErrors.join('\n'));
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const calendarService = new CalendarService();

    // 若地點包含 TRB，檢查場地衝突（排除自身事件）
    if (location && location.toUpperCase().includes('TRB')) {
      const startTime = Parser.combineDateTime(date, time);
      if (startTime.isValid()) {
        const endTime = startTime.add(duration, 'hour');
        const venueConflict = await calendarService.checkVenueConflicts(
          startTime.toISOString(),
          endTime.toISOString(),
          editData.id
        );

        if (venueConflict.hasConflict) {
          const conflictEmbed = EmbedBuilderUtil.createVenueConflictEmbed(venueConflict);
          await interaction.editReply({ embeds: [conflictEmbed] });
          editingMeetings.delete(userId);
          return;
        }
      }
    }

    // 更新會議
    const event = await calendarService.updateMeeting(editData.id, meetingData);

    const confirmEmbed = EmbedBuilderUtil.createMeetingConfirmEmbed(meetingData, event);
    confirmEmbed.setTitle('✅ 會議更新成功');
    confirmEmbed.setColor(CONSTANTS.COLORS.SUCCESS);

    // 加入隨機圖片
    const randomImage = getRandomMeetingEditSuccessImage();
    if (randomImage) {
      confirmEmbed.setImage(randomImage);
    }

    // 先給編輯者一個私人確認訊息
    await interaction.editReply({
      content: '✅ 會議已成功更新！',
      embeds: [],
      components: []
    });

    // 在頻道發送公開的會議更新成功訊息
    await interaction.channel.send({ embeds: [confirmEmbed] });

    // 觸發布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerBoardUpdate();
      // 若地點含 TRB，也更新場地布告欄
      if (location && location.toUpperCase().includes('TRB')) {
        await scheduler.triggerVenueBoardUpdate();
      }
      console.log('[EditMeeting] 已觸發布告欄更新');
    }

    // 清除編輯資料
    editingMeetings.delete(userId);
  } catch (error) {
    console.error('❌ 更新會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('更新會議失敗', error.message);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * 處理取消編輯
 */
export async function handleCancelEdit(interaction) {
  const userId = interaction.user.id;
  editingMeetings.delete(userId);

  await interaction.update({
    content: '❌ 已取消編輯會議',
    embeds: [],
    components: [],
  });
}
