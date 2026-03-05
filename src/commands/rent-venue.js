import {
  SlashCommandBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import CalendarService from '../services/calendar.js';
import Parser from '../services/parser.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import CONSTANTS from '../config/constants.js';

// 儲存臨時租借資料 (key: userId)
export const tempRentalData = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('rent-venue')
    .setDescription('登記 TRB 工作室場地租借'),

  async execute(interaction) {
    tempRentalData.set(interaction.user.id, {
      guild_id: interaction.guildId,
      channel_id: interaction.channelId,
      creator_id: interaction.user.id,
    });

    const registrarSelect = new UserSelectMenuBuilder()
      .setCustomId('rental_registrar')
      .setPlaceholder('選擇登記者 (單選)')
      .setMinValues(1)
      .setMaxValues(1);

    const nextButton = new ButtonBuilder()
      .setCustomId('rental_show_modal')
      .setLabel('下一步:填寫租借詳情')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');

    await interaction.reply({
      content: '🏢 **租借 TRB 工作室** - 請選擇登記者:',
      components: [
        new ActionRowBuilder().addComponents(registrarSelect),
        new ActionRowBuilder().addComponents(nextButton),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

/**
 * 處理登記者選擇
 */
export async function handleRegistrarSelection(interaction) {
  const userId = interaction.user.id;
  const data = tempRentalData.get(userId) || {};

  const registrarId = interaction.values[0];
  const registrarMember = interaction.guild.members.cache.get(registrarId);
  data.registrar_id = registrarId;
  data.registrar_name = registrarMember?.user.username || 'Unknown';

  tempRentalData.set(userId, data);

  await interaction.update({
    content: `🏢 **租借 TRB 工作室**\n\n✅ **登記者**: <@${registrarId}>\n\n請點擊下一步填寫租借詳情`,
    components: interaction.message.components,
  });
}

/**
 * 顯示 Modal 表單
 */
export async function showDetailsModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('rental_details_modal')
    .setTitle('TRB 工作室租借詳情');

  const dateTimeInput = new TextInputBuilder()
    .setCustomId('rental_datetime')
    .setLabel('日期與開始時間 (格式: YYYYMMDD HHMM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: 20251215 1400')
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId('rental_title')
    .setLabel('活動標題')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: TRPG 冒險者之旅 第三回')
    .setMaxLength(100)
    .setRequired(true);

  const durationInput = new TextInputBuilder()
    .setCustomId('rental_duration')
    .setLabel('活動時長 (小時)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: 4 或 2.5')
    .setValue('2')
    .setRequired(true);

  const renterInput = new TextInputBuilder()
    .setCustomId('rental_renter_name')
    .setLabel('租借人名稱')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例如: 小明')
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId('rental_content')
    .setLabel('活動內容')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例如: TRPG 冒險者之旅 第三回')
    .setMaxLength(1000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateTimeInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(renterInput),
    new ActionRowBuilder().addComponents(contentInput),
  );

  await interaction.showModal(modal);
}

/**
 * 處理 Modal 提交
 */
export async function handleModalSubmit(interaction) {
  const userId = interaction.user.id;
  const data = tempRentalData.get(userId) || {};

  const dateTimeStr = interaction.fields.getTextInputValue('rental_datetime');
  const dateTimeParts = dateTimeStr.trim().split(/\s+/);

  if (dateTimeParts.length < 2) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '格式錯誤',
      ['日期時間格式錯誤，請使用格式: YYYYMMDD HHMM (例如: 20251215 1400)']
    );
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    return;
  }

  data.date = Parser.parseDate(dateTimeParts[0]);
  data.time = Parser.parseTime(dateTimeParts[1]);
  data.title = interaction.fields.getTextInputValue('rental_title');
  data.duration = parseFloat(interaction.fields.getTextInputValue('rental_duration')) || CONSTANTS.DEFAULTS.RENTAL_DURATION;
  data.renter_name = interaction.fields.getTextInputValue('rental_renter_name');
  data.content = interaction.fields.getTextInputValue('rental_content') || '';

  // 如果沒有選擇登記者，使用指令發起者
  if (!data.registrar_id) {
    data.registrar_id = interaction.user.id;
    data.registrar_name = interaction.user.username;
  }

  tempRentalData.set(userId, data);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const calendarService = new CalendarService();
  const startTime = Parser.combineDateTime(data.date, data.time);

  if (!startTime.isValid()) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '日期時間格式錯誤',
      [`無法解析日期時間: ${data.date} ${data.time}`]
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    tempRentalData.delete(userId);
    return;
  }

  const endTime = startTime.add(data.duration, 'hour');

  // 檢查場地衝突
  const venueConflict = await calendarService.checkVenueConflicts(
    startTime.toISOString(),
    endTime.toISOString()
  );

  if (venueConflict.hasConflict) {
    const conflictEmbed = EmbedBuilderUtil.createVenueConflictEmbed(venueConflict);

    const confirmButton = new ButtonBuilder()
      .setCustomId('rental_confirm_create')
      .setLabel('確認租借')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('rental_cancel_create')
      .setLabel('取消')
      .setStyle(ButtonStyle.Danger);

    await interaction.editReply({
      embeds: [conflictEmbed],
      components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
    });
    return;
  }

  await createRental(interaction, data);
}

/**
 * 建立租借
 */
export async function createRental(interaction, data) {
  try {
    const calendarService = new CalendarService();
    const event = await calendarService.createRental(data);

    const confirmEmbed = EmbedBuilderUtil.createRentalConfirmEmbed(data, event);

    if (interaction.deferred) {
      await interaction.editReply({ content: '✅ 租借登記中...', components: [] });
    }

    await interaction.channel.send({ embeds: [confirmEmbed] });

    if (!interaction.deferred) {
      await interaction.reply({ content: '✅ 租借已成功登記！', flags: MessageFlags.Ephemeral });
    }

    // 觸發場地布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerVenueBoardUpdate();
    }

    tempRentalData.delete(interaction.user.id);
  } catch (error) {
    console.error('建立租借失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('建立租借失敗', error.message);

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}
