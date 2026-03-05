import {
  SlashCommandBuilder,
  ActionRowBuilder,
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
import { createDate } from '../utils/date-utils.js';

// 儲存臨時編輯資料 (key: userId)
export const tempEditRentalData = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('edit-rental')
    .setDescription('編輯場地租借')
    .addStringOption(option =>
      option
        .setName('event_id')
        .setDescription('租借事件 ID (從 /list-rentals 取得)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const eventId = interaction.options.getString('event_id');
    const calendarService = new CalendarService();

    try {
      const rental = await calendarService.getMeeting(eventId);

      // 確認是租借事件
      if (rental.event_type !== 'venue_rental') {
        const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
          '操作失敗',
          ['此 ID 不是租借事件，請使用 /cancel-meeting 取消會議']
        );
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      // 儲存租借資料供後續使用
      tempEditRentalData.set(interaction.user.id, {
        eventId,
        rental,
        guild_id: interaction.guildId,
        channel_id: interaction.channelId,
      });

      const startTime = createDate(rental.startTime);
      const endTime = createDate(rental.endTime);
      const durationHours = endTime.diff(startTime, 'hour', true);

      // 顯示 Modal
      const modal = new ModalBuilder()
        .setCustomId('edit_rental_modal')
        .setTitle('編輯場地租借');

      const dateTimeInput = new TextInputBuilder()
        .setCustomId('edit_rental_datetime')
        .setLabel('日期與開始時間 (格式: YYYYMMDD HHMM)')
        .setStyle(TextInputStyle.Short)
        .setValue(`${startTime.format('YYYYMMDD')} ${startTime.format('HHmm')}`)
        .setRequired(true);

      const titleInput = new TextInputBuilder()
        .setCustomId('edit_rental_title')
        .setLabel('活動標題')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setValue(rental.title || '')
        .setRequired(true);

      const durationInput = new TextInputBuilder()
        .setCustomId('edit_rental_duration')
        .setLabel('活動時長 (小時)')
        .setStyle(TextInputStyle.Short)
        .setValue(String(durationHours))
        .setRequired(true);

      const renterInput = new TextInputBuilder()
        .setCustomId('edit_rental_renter_name')
        .setLabel('租借人名稱')
        .setStyle(TextInputStyle.Short)
        .setValue(rental.renter_name || '')
        .setRequired(true);

      const contentInput = new TextInputBuilder()
        .setCustomId('edit_rental_content')
        .setLabel('活動內容')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setValue(rental.content || '')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(dateTimeInput),
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(renterInput),
        new ActionRowBuilder().addComponents(contentInput),
      );

      // 先關閉 deferred reply，再顯示 Modal
      await interaction.deleteReply();
      await interaction.showModal(modal);
    } catch (error) {
      console.error('❌ 載入租借事件失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '載入失敗',
        error.message || '找不到租借事件或事件已被刪除'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

/**
 * 處理 Modal 提交
 */
export async function handleModalSubmit(interaction) {
  const userId = interaction.user.id;
  const stored = tempEditRentalData.get(userId);

  if (!stored) {
    await interaction.reply({
      content: '❌ 找不到編輯資料，請重新執行 /edit-rental',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const dateTimeStr = interaction.fields.getTextInputValue('edit_rental_datetime');
  const dateTimeParts = dateTimeStr.trim().split(/\s+/);

  if (dateTimeParts.length < 2) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '格式錯誤',
      ['日期時間格式錯誤，請使用格式: YYYYMMDD HHMM']
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const updateData = {
    date: Parser.parseDate(dateTimeParts[0]),
    time: Parser.parseTime(dateTimeParts[1]),
    title: interaction.fields.getTextInputValue('edit_rental_title'),
    duration: parseFloat(interaction.fields.getTextInputValue('edit_rental_duration')) || CONSTANTS.DEFAULTS.RENTAL_DURATION,
    renter_name: interaction.fields.getTextInputValue('edit_rental_renter_name'),
    content: interaction.fields.getTextInputValue('edit_rental_content') || '',
  };

  const calendarService = new CalendarService();
  const startTime = Parser.combineDateTime(updateData.date, updateData.time);

  if (!startTime.isValid()) {
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '日期時間格式錯誤',
      [`無法解析日期時間: ${updateData.date} ${updateData.time}`]
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const endTime = startTime.add(updateData.duration, 'hour');

  // 檢查場地衝突（排除自身事件）
  const venueConflict = await calendarService.checkVenueConflicts(
    startTime.toISOString(),
    endTime.toISOString(),
    stored.eventId
  );

  if (venueConflict.hasConflict) {
    const conflictEmbed = EmbedBuilderUtil.createVenueConflictEmbed(venueConflict);

    const confirmButton = new ButtonBuilder()
      .setCustomId('edit_rental_confirm')
      .setLabel('確認更新')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('edit_rental_cancel')
      .setLabel('取消')
      .setStyle(ButtonStyle.Danger);

    // 儲存更新資料
    stored.updateData = updateData;
    tempEditRentalData.set(userId, stored);

    await interaction.editReply({
      embeds: [conflictEmbed],
      components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)],
    });
    return;
  }

  await doUpdateRental(interaction, stored.eventId, updateData);
  tempEditRentalData.delete(userId);
}

/**
 * 處理確認更新按鈕
 */
export async function handleConfirmUpdate(interaction) {
  const userId = interaction.user.id;
  const stored = tempEditRentalData.get(userId);

  if (!stored?.updateData) {
    await interaction.update({ content: '❌ 找不到更新資料', embeds: [], components: [] });
    return;
  }

  await interaction.deferUpdate();
  await doUpdateRental(interaction, stored.eventId, stored.updateData);
  tempEditRentalData.delete(userId);
}

/**
 * 處理取消更新按鈕
 */
export async function handleCancelUpdate(interaction) {
  tempEditRentalData.delete(interaction.user.id);
  await interaction.update({ content: '❌ 已取消更新', embeds: [], components: [] });
}

/**
 * 執行更新租借
 */
async function doUpdateRental(interaction, eventId, updateData) {
  try {
    const calendarService = new CalendarService();
    await calendarService.updateRental(eventId, updateData);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '✅ 租借已成功更新！', embeds: [], components: [] });
    }

    // 觸發場地布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerVenueBoardUpdate();
    }

    console.log(`[EditRental] ✅ 租借已更新: ${eventId}`);
  } catch (error) {
    console.error('❌ 更新租借失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('更新租借失敗', error.message);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
  }
}
