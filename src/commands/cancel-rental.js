import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import CONSTANTS from '../config/constants.js';
import { createDate } from '../utils/date-utils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('cancel-rental')
    .setDescription('取消場地租借')
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

      const startTime = createDate(rental.startTime);
      const endTime = createDate(rental.endTime);

      const confirmEmbed = new EmbedBuilder()
        .setColor(CONSTANTS.COLORS.WARNING)
        .setTitle('⚠️ 確認取消租借')
        .setDescription('你確定要取消以下租借嗎？**此操作無法復原**。')
        .addFields(
          { name: '🏢 場地', value: CONSTANTS.RENTAL_LOCATION, inline: false },
          { name: '🎭 活動標題', value: rental.title || '未設定', inline: false },
          { name: '📅 日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
          { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
          { name: '👤 租借人', value: rental.renter_name || '未設定', inline: true },
          { name: '📋 登記者', value: rental.registrar_id ? `<@${rental.registrar_id}>` : rental.registrar_name || '未設定', inline: true },
        )
        .setTimestamp();

      const confirmButton = new ButtonBuilder()
        .setCustomId(`cancel_rental_confirm_${eventId}`)
        .setLabel('確認取消')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('✅');

      const abortButton = new ButtonBuilder()
        .setCustomId('cancel_rental_abort')
        .setLabel('取消操作')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [new ActionRowBuilder().addComponents(confirmButton, abortButton)],
      });
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
 * 處理取消租借確認
 */
export async function handleCancelConfirm(interaction, eventId) {
  await interaction.deferUpdate();

  try {
    const calendarService = new CalendarService();
    const rental = await calendarService.getMeeting(eventId);
    await calendarService.deleteMeeting(eventId);

    const successEmbed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle('✅ 租借已取消')
      .setDescription(`已成功取消租借: **${rental.title}**`)
      .addFields(
        { name: '🏢 場地', value: CONSTANTS.RENTAL_LOCATION, inline: true },
        { name: '👤 租借人', value: rental.renter_name || '未設定', inline: true },
        { name: '🗑️ 已移除', value: '租借事件已從 Google Calendar 中刪除', inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ content: '✅ 租借已成功取消！', embeds: [], components: [] });
    await interaction.channel.send({ embeds: [successEmbed] });

    // 觸發場地布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerVenueBoardUpdate();
    }

    console.log(`[CancelRental] ✅ 租借已取消: ${rental.title} (ID: ${eventId})`);
  } catch (error) {
    console.error('❌ 取消租借失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed('取消租借失敗', error.message);
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

/**
 * 處理取消操作
 */
export async function handleCancelAbort(interaction) {
  await interaction.update({ content: '❌ 已取消操作，租借保持不變', embeds: [], components: [] });
}
