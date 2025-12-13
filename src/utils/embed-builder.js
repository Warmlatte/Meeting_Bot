import { EmbedBuilder } from 'discord.js';
import CONSTANTS from '../config/constants.js';
import dayjs from 'dayjs';

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

      const participantNames = conflict.participants.map(p => p.name || `<@${p.user_id}>`).join(', ');
      const timeRange = `${startTime.format('HH:mm')}-${endTime.format('HH:mm')}`;

      embed.addFields({
        name: `👤 ${participantNames}`,
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

export default EmbedBuilderUtil;
