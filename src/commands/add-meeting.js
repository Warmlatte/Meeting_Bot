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
  MessageFlags,
} from "discord.js";
import CalendarService from "../services/calendar.js";
import Parser from "../services/parser.js";
import Validator from "../utils/validator.js";
import EmbedBuilderUtil from "../utils/embed-builder.js";
import CONSTANTS from "../config/constants.js";

// 儲存臨時會議資料 (使用 Map,key 為 userId)
export const tempMeetingData = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName("add-meeting")
    .setDescription("新增會議"),

  async execute(interaction) {
    // 初始化臨時資料
    tempMeetingData.set(interaction.user.id, {
      guild_id: interaction.guildId,
      channel_id: interaction.channelId,
      creator_id: interaction.user.id,
    });

    // 建立選單
    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId("meeting_type")
      .setPlaceholder("選擇會議類型")
      .addOptions([
        { label: "線上會議", value: "online", emoji: "💻" },
        { label: "線下會議", value: "offline", emoji: "🏢" },
      ]);

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId("meeting_participants")
      .setPlaceholder("選擇參加者 (可複選)")
      .setMinValues(1)
      .setMaxValues(20);

    const nextButton = new ButtonBuilder()
      .setCustomId("meeting_show_modal")
      .setLabel("下一步:填寫詳細資訊")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝");

    await interaction.reply({
      content: "📅 **新增會議** - 請填寫會議資訊:",
      components: [
        new ActionRowBuilder().addComponents(typeSelect),
        new ActionRowBuilder().addComponents(userSelect),
        new ActionRowBuilder().addComponents(nextButton),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

/**
 * 產生包含已選擇資料的訊息內容
 */
function generateStatusMessage(data) {
  let message = "📅 **新增會議** - 請填寫會議資訊:\n\n";

  if (data.type) {
    message += `✅ **會議類型**: ${data.type}\n`;
  }

  if (data.participants && data.participants.length > 0) {
    message += `✅ **參加者**: ${data.participants.length} 位 (${data.participants.map(p => p.name).join(', ')})\n`;
  }

  if (!data.type || !data.participants || data.participants.length === 0) {
    message += "⏳ 請繼續選擇...";
  }

  return message;
}

/**
 * 處理會議類型選擇
 */
export async function handleTypeSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  const selectedType = interaction.values[0];
  data.type =
    selectedType === "online"
      ? CONSTANTS.MEETING_TYPES.ONLINE
      : CONSTANTS.MEETING_TYPES.OFFLINE;
  data.location =
    selectedType === "online" ? CONSTANTS.DEFAULTS.ONLINE_LOCATION : "";

  tempMeetingData.set(userId, data);

  await interaction.update({
    content: generateStatusMessage(data),
    components: interaction.message.components,
  });
}

/**
 * 處理參加者選擇
 */
export async function handleParticipantsSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempMeetingData.get(userId) || {};

  data.participants = interaction.values.map((id) => ({
    user_id: id,
    name: interaction.guild.members.cache.get(id)?.user.username || "Unknown",
  }));

  tempMeetingData.set(userId, data);

  await interaction.update({
    content: generateStatusMessage(data),
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
    .setCustomId("meeting_details_modal")
    .setTitle("會議詳細資訊");

  const dateTimeInput = new TextInputBuilder()
    .setCustomId("meeting_datetime")
    .setLabel("會議日期與時間 (格式: YYYY-MM-DD HH:MM)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("例如: 20251215 14:00 或 2025-12-15 14:00")
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId("meeting_title")
    .setLabel("會議名稱")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("例如: 劇本架構會議")
    .setMaxLength(100)
    .setRequired(true);

  const locationInput = new TextInputBuilder()
    .setCustomId("meeting_location")
    .setLabel("會議地點")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(data.location || "例如: TRB工作室")
    .setValue(data.location || "")
    .setRequired(true);

  const durationInput = new TextInputBuilder()
    .setCustomId("meeting_duration")
    .setLabel("會議時長 (小時)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("例如: 2 或 1.5")
    .setValue("2")
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId("meeting_content")
    .setLabel("會議內容")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("例如:\n1. 討論劇本架構\n2. 確認時間表")
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateTimeInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(locationInput),
    new ActionRowBuilder().addComponents(durationInput),
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
  const dateTimeStr = interaction.fields.getTextInputValue("meeting_datetime");

  // 解析日期時間 (格式: "2025-12-15 14:00" 或 "25/12/15 14:00")
  const dateTimeParts = dateTimeStr.trim().split(/\s+/);
  if (dateTimeParts.length < 2) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      "資料驗證失敗",
      ["日期時間格式錯誤，請使用格式: 20251215 14:00 或 2025-12-15 14:00"]
    );
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    return;
  }

  data.date = Parser.parseDate(dateTimeParts[0]);
  data.time = Parser.parseTime(dateTimeParts[1]);
  data.title = interaction.fields.getTextInputValue("meeting_title");
  data.location = interaction.fields.getTextInputValue("meeting_location");
  data.duration = parseFloat(interaction.fields.getTextInputValue("meeting_duration")) || 2;
  data.content = interaction.fields.getTextInputValue("meeting_content");

  // 驗證資料
  const meetingErrors = Validator.validateMeeting(data);
  const participantErrors = Validator.validateParticipants(data.participants);
  const allErrors = [...meetingErrors, ...participantErrors];

  if (allErrors.length > 0) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      "資料驗證失敗",
      allErrors
    );
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    tempMeetingData.delete(userId);
    return;
  }

  // 檢查時間衝突
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const calendarService = new CalendarService();
  const startTime = Parser.combineDateTime(data.date, data.time);

  // 驗證日期時間是否有效
  if (!startTime.isValid()) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      "日期時間格式錯誤",
      [`無法解析日期時間: ${data.date} ${data.time}`, "請使用格式: 20251215 14:00 或 2025-12-15 14:00 (例如: 20251215 14:00)"]
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    tempMeetingData.delete(userId);
    return;
  }

  const endTime = startTime.add(data.duration || 2, "hour");

  const conflictCheck = await calendarService.checkConflicts(
    startTime.toISOString(),
    endTime.toISOString(),
    data.participants
  );

  if (conflictCheck.hasConflict) {
    const conflictEmbed = EmbedBuilderUtil.createConflictEmbed(conflictCheck);

    const confirmButton = new ButtonBuilder()
      .setCustomId("meeting_confirm_create")
      .setLabel("確認建立")
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId("meeting_cancel_create")
      .setLabel("取消")
      .setStyle(ButtonStyle.Danger);

    await interaction.editReply({
      embeds: [conflictEmbed],
      components: [
        new ActionRowBuilder().addComponents(confirmButton, cancelButton),
      ],
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

    const confirmEmbed = EmbedBuilderUtil.createMeetingConfirmEmbed(
      data,
      event
    );

    // 先給建立者一個私人確認訊息（如果是 deferred）
    if (interaction.deferred) {
      await interaction.editReply({
        content: '✅ 會議建立中...',
        components: []
      });
    }

    // 在頻道發送公開的會議建立成功訊息
    await interaction.channel.send({ embeds: [confirmEmbed] });

    // 如果不是 deferred，給建立者一個私人確認
    if (!interaction.deferred) {
      await interaction.reply({
        content: '✅ 會議已成功建立！',
        flags: MessageFlags.Ephemeral
      });
    }

    tempMeetingData.delete(interaction.user.id);
  } catch (error) {
    console.error("建立會議失敗:", error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      "建立會議失敗",
      error.message
    );

    // 錯誤訊息保持私人（ephemeral）
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}
