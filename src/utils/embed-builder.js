import { EmbedBuilder } from 'discord.js';
import CONSTANTS from '../config/constants.js';
import { getRandomMeetingSuccessImage } from '../config/images.js';
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

    const embed = new EmbedBuilder()
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

    // 隨機加入圖片（如果有配置）
    const randomImage = getRandomMeetingSuccessImage();
    if (randomImage) {
      embed.setImage(randomImage);
    }

    return embed;
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
}

export default EmbedBuilderUtil;
