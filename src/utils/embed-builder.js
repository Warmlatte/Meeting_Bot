import { EmbedBuilder } from 'discord.js';
import CONSTANTS from '../config/constants.js';
import { getRandomMeetingSuccessImage } from '../config/images.js';
import { createDate, now } from '../utils/date-utils.js';

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
    const startTime = createDate(event.start.dateTime);
    const endTime = createDate(event.end.dateTime);

    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle('✅ 會議建立成功')
      .addFields(
        { name: '📅 日期', value: startTime.format('YYYY-MM-DD'), inline: true },
        { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
        { name: '📝 類型', value: meeting.type || '未設定', inline: true },
        { name: '📋 會議名稱', value: meeting.title || '未設定', inline: false },
        { name: '📍 地點', value: meeting.location || '未設定', inline: false },
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
      const startTime = createDate(conflictMeeting.start.dateTime);
      const endTime = createDate(conflictMeeting.end.dateTime);

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
      const startTime = createDate(meeting.startTime);
      const endTime = createDate(meeting.endTime);
      const participantCount = meeting.participants.length;

      description += `\n**🕐 ${startTime.format('MM/DD HH:mm')} - ${endTime.format('HH:mm')}**\n`;
      description += `📋 ${meeting.type || '未設定'} | ${meeting.title || '未設定'}\n`;
      description += `📍 ${meeting.location || '未設定'}\n`;
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

  /**
   * 建立會議提醒 Embed (DM 用)
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型 ('2h' 或 '1d')
   * @returns {EmbedBuilder}
   */
  static createReminderEmbed(meeting, reminderType) {
    const startTime = createDate(meeting.startTime);
    const endTime = createDate(meeting.endTime);

    const reminderTexts = {
      '2h': '⏰ 2 小時後有會議',
      '1d': '📅 明天有會議',
    };

    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.WARNING)
      .setTitle(reminderTexts[reminderType] || '🔔 會議提醒')
      .addFields(
        { name: '📋 會議名稱', value: meeting.title || '未設定', inline: false },
        { name: '📅 日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
        { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
        { name: '📍 地點', value: meeting.location || '未設定', inline: true }
      )
      .setTimestamp();

    // 會議內容
    if (meeting.content) {
      // 限制長度避免過長
      const displayContent = meeting.content.length > 200
        ? meeting.content.substring(0, 200) + '...'
        : meeting.content;
      embed.addFields({ name: '📝 會議內容', value: displayContent, inline: false });
    }

    // 參加者
    if (meeting.participants && meeting.participants.length > 0) {
      const participantNames = meeting.participants
        .map(p => `• ${p.name}`)
        .join('\n');
      embed.addFields({
        name: `👥 參加者 (${meeting.participants.length})`,
        value: participantNames,
        inline: false
      });
    }

    embed.setFooter({ text: 'Meeting Bot 提醒服務' });

    return embed;
  }

  /**
   * 建立頻道提醒訊息內容
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型
   * @returns {string}
   */
  static createChannelReminderText(meeting, reminderType) {
    const startTime = createDate(meeting.startTime);
    const participantMentions = meeting.participants
      .map(p => `<@${p.user_id}>`)
      .join(' ');

    const timeTexts = {
      '2h': `2 小時後 (${startTime.format('HH:mm')})`,
      '1d': `明天 ${startTime.format('HH:mm')}`,
    };

    return `🔔 **會議提醒**\n\n${participantMentions}\n\n${timeTexts[reminderType]} 有【${meeting.title || '未設定'}】會議\n📍 地點: ${meeting.location || '未設定'}`;
  }

  /**
   * 建立今日會議布告欄 Embed
   * @param {Array} meetings - 今日會議列表
   * @returns {EmbedBuilder}
   */
  static createTodayBoardEmbed(meetings) {
    const today = now();
    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.PRIMARY)
      .setTitle(`📅 今日會議 (${today.format('YYYY-MM-DD')})`)
      .setTimestamp();

    if (meetings.length === 0) {
      embed.setDescription('今天沒有會議 🎉');
      embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
      return embed;
    }

    let description = '';

    // 按時間排序
    const sortedMeetings = meetings.sort((a, b) => {
      return createDate(a.startTime).isBefore(createDate(b.startTime)) ? -1 : 1;
    });

    for (const meeting of sortedMeetings) {
      const startTime = createDate(meeting.startTime);
      const endTime = createDate(meeting.endTime);

      // 判斷會議是否已結束
      const isPast = now().isAfter(endTime);
      const statusEmoji = isPast ? '✅' : '🕐';

      description += `\n${statusEmoji} **${startTime.format('HH:mm')}** | ${meeting.type || '未設定'} | **${meeting.title || '未設定'}**\n`;
      description += `   📍 ${meeting.location || '未設定'}\n`;

      if (meeting.participants.length > 0) {
        const participantMentions = meeting.participants
          .map(p => `<@${p.user_id}>`)
          .join(' ');
        description += `   👥 ${participantMentions}\n`;
      }

      description += '\n';
    }

    embed.setDescription(description);
    embed.setFooter({
      text: `共 ${meetings.length} 場會議 • Meeting Bot • 每日 00:00 自動更新`
    });

    return embed;
  }

  /**
   * 建立本週會議布告欄 Embed
   * @param {Array} meetings - 本週會議列表
   * @returns {EmbedBuilder}
   */
  static createWeekBoardEmbed(meetings) {
    const weekStart = now().startOf('isoWeek');
    const weekEnd = now().endOf('isoWeek');

    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.PRIMARY)
      .setTitle(`📆 本週會議 (${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')})`)
      .setTimestamp();

    if (meetings.length === 0) {
      embed.setDescription('本週沒有會議 🎉');
      embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
      return embed;
    }

    // 按日期分組
    const meetingsByDay = {};

    for (const meeting of meetings) {
      const startTime = createDate(meeting.startTime);
      const dayKey = startTime.format('YYYY-MM-DD');

      if (!meetingsByDay[dayKey]) {
        meetingsByDay[dayKey] = [];
      }

      meetingsByDay[dayKey].push(meeting);
    }

    let description = '';

    // 按日期順序顯示
    const sortedDays = Object.keys(meetingsByDay).sort();

    for (const dayKey of sortedDays) {
      const date = createDate(dayKey);
      const dayMeetings = meetingsByDay[dayKey];

      // 日期標題
      const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
      const isToday = date.isSame(now(), 'day');
      const dayTitle = isToday
        ? `【${date.format('MM/DD')} 週${dayOfWeek}】 ⭐ 今天`
        : `【${date.format('MM/DD')} 週${dayOfWeek}】`;

      description += `\n**${dayTitle}**\n`;

      // 排序會議
      const sortedMeetings = dayMeetings.sort((a, b) => {
        return createDate(a.startTime).isBefore(createDate(b.startTime)) ? -1 : 1;
      });

      for (const meeting of sortedMeetings) {
        const startTime = createDate(meeting.startTime);

        description += `🕐 ${startTime.format('HH:mm')} | ${meeting.type || '未設定'} | ${meeting.title || '未設定'}\n`;
        description += `   📍 ${meeting.location || '未設定'}\n`;

        if (meeting.participants.length > 0 && meeting.participants.length <= 5) {
          const participantMentions = meeting.participants
            .map(p => `<@${p.user_id}>`)
            .join(' ');
          description += `   👥 ${participantMentions}\n`;
        } else if (meeting.participants.length > 5) {
          description += `   👥 ${meeting.participants.length} 位參加者\n`;
        }

        description += '\n';
      }
    }

    embed.setDescription(description);
    embed.setFooter({
      text: `共 ${meetings.length} 場會議 • Meeting Bot • 每日 00:00 自動更新`
    });

    return embed;
  }

  /**
   * 建立租借確認 Embed
   * @param {Object} rental - 租借資料
   * @param {Object} event - Google Calendar 事件
   * @returns {EmbedBuilder}
   */
  static createRentalConfirmEmbed(rental, event) {
    const startTime = createDate(event.start.dateTime);
    const endTime = createDate(event.end.dateTime);

    return new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle('✅ 租借登記成功')
      .addFields(
        { name: '🏢 場地', value: '🏢 TRB工作室', inline: false },
        { name: '📅 日期', value: startTime.format('YYYY-MM-DD (dddd)'), inline: true },
        { name: '🕐 時間', value: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`, inline: true },
        { name: '🎭 活動標題', value: rental.title || '未設定', inline: false },
        { name: '👤 租借人', value: rental.renter_name || '未設定', inline: true },
        { name: '📋 登記者', value: `<@${rental.registrar_id}>`, inline: true },
        { name: '🆔 事件 ID', value: `\`${event.id}\``, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Meeting Bot' });
  }

  /**
   * 建立租借列表 Embed
   * @param {Array} rentals - 租借列表
   * @param {string} filterType - 篩選類型
   * @param {number} page - 當前頁數
   * @param {number} totalPages - 總頁數
   * @returns {EmbedBuilder}
   */
  static createRentalListEmbed(rentals, filterType, page = 1, totalPages = 1) {
    const filterTitles = {
      today: '今日租借',
      this_week: '本週租借',
      this_month: '本月租借',
    };

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6) // 葡萄紫
      .setTitle(`🏢 ${filterTitles[filterType] || '租借清單'}`)
      .setTimestamp();

    if (rentals.length === 0) {
      embed.setDescription('目前沒有租借記錄');
      embed.setFooter({ text: 'Meeting Bot' });
      return embed;
    }

    const startIndex = (page - 1) * 5;
    const pageMeetings = rentals.slice(startIndex, startIndex + 5);
    let description = '';

    for (const rental of pageMeetings) {
      const startTime = createDate(rental.startTime);
      const endTime = createDate(rental.endTime);

      description += `\n**🕐 ${startTime.format('MM/DD HH:mm')} - ${endTime.format('HH:mm')}**\n`;
      description += `🎭 ${rental.title || '未設定'}\n`;
      description += `👤 租借人: ${rental.renter_name || '未設定'}\n`;
      description += `📋 登記者: ${rental.registrar_id ? `<@${rental.registrar_id}>` : rental.registrar_name || '未設定'}\n`;
      description += `🆔 \`${rental.id}\`\n`;
      description += `─────────────────\n`;
    }

    embed.setDescription(description);
    embed.setFooter({
      text: totalPages > 1 ? `第 ${page} / ${totalPages} 頁 • Meeting Bot` : 'Meeting Bot',
    });

    return embed;
  }

  /**
   * 建立場地布告欄今日 Embed
   * @param {Array} occupiedSlots - TRB 佔用時段 (Google Calendar 原始事件)
   * @returns {EmbedBuilder}
   */
  static createVenueBoardTodayEmbed(occupiedSlots) {
    const today = now();
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c) // 紅色系
      .setTitle(`🏢 TRB工作室 今日場地使用 (${today.format('YYYY-MM-DD')})`)
      .setTimestamp();

    if (occupiedSlots.length === 0) {
      embed.setDescription('今日場地空閒 🟢');
      embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
      return embed;
    }

    const sorted = [...occupiedSlots].sort((a, b) => {
      const ta = a.start?.dateTime || a.start?.date || '';
      const tb = b.start?.dateTime || b.start?.date || '';
      return ta.localeCompare(tb);
    });

    let description = '';
    for (const slot of sorted) {
      const s = createDate(slot.start.dateTime || slot.start.date);
      const e = createDate(slot.end.dateTime || slot.end.date);
      description += `🔴 **${s.format('HH:mm')} - ${e.format('HH:mm')}** 已佔用\n`;
    }

    embed.setDescription(description);
    embed.setFooter({
      text: `共 ${occupiedSlots.length} 個時段已佔用 • Meeting Bot • 每日 00:00 自動更新`,
    });

    return embed;
  }

  /**
   * 建立場地布告欄本週 Embed
   * @param {Array} occupiedSlots - TRB 佔用時段 (Google Calendar 原始事件)
   * @returns {EmbedBuilder}
   */
  static createVenueBoardWeekEmbed(occupiedSlots) {
    const weekStart = now().startOf('isoWeek');
    const weekEnd = now().endOf('isoWeek');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`🏢 TRB工作室 本週場地使用 (${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')})`)
      .setTimestamp();

    if (occupiedSlots.length === 0) {
      embed.setDescription('本週場地全部空閒 🟢');
      embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
      return embed;
    }

    // 按日期分組
    const byDay = {};
    for (const slot of occupiedSlots) {
      const s = createDate(slot.start.dateTime || slot.start.date);
      const dayKey = s.format('YYYY-MM-DD');
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(slot);
    }

    let description = '';
    const dayOfWeekNames = ['日', '一', '二', '三', '四', '五', '六'];

    for (const dayKey of Object.keys(byDay).sort()) {
      const date = createDate(dayKey);
      const dow = dayOfWeekNames[date.day()];
      const isToday = date.isSame(now(), 'day');
      const dayTitle = isToday
        ? `【${date.format('MM/DD')} 週${dow}】 ⭐ 今天`
        : `【${date.format('MM/DD')} 週${dow}】`;

      description += `\n**${dayTitle}**\n`;

      const sorted = byDay[dayKey].sort((a, b) => {
        const ta = a.start?.dateTime || a.start?.date || '';
        const tb = b.start?.dateTime || b.start?.date || '';
        return ta.localeCompare(tb);
      });

      for (const slot of sorted) {
        const s = createDate(slot.start.dateTime || slot.start.date);
        const e = createDate(slot.end.dateTime || slot.end.date);
        description += `🔴 **${s.format('HH:mm')} - ${e.format('HH:mm')}** 已佔用\n`;
      }
    }

    embed.setDescription(description);
    embed.setFooter({
      text: `共 ${occupiedSlots.length} 個時段已佔用 • Meeting Bot • 每日 00:00 自動更新`,
    });

    return embed;
  }

  /**
   * 建立場地衝突警告 Embed
   * @param {Object} conflictData - 衝突資料 { hasConflict, conflicts[] }
   * @returns {EmbedBuilder}
   */
  static createVenueConflictEmbed(conflictData) {
    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.WARNING)
      .setTitle('⚠️ 場地時段衝突警告')
      .setDescription('TRB工作室在此時段已有其他佔用:')
      .setTimestamp();

    for (const conflict of conflictData.conflicts) {
      const s = createDate(conflict.start.dateTime || conflict.start.date);
      const e = createDate(conflict.end.dateTime || conflict.end.date);
      embed.addFields({
        name: `🔴 ${s.format('HH:mm')} - ${e.format('HH:mm')}`,
        value: '場地已佔用',
        inline: false,
      });
    }

    embed.addFields({
      name: '\u200B',
      value: '是否仍要進行租借/使用此場地?',
      inline: false,
    });

    return embed;
  }

  /**
   * 建立下週會議布告欄 Embed
   * @param {Array} meetings - 下週會議列表
   * @returns {EmbedBuilder}
   */
  static createNextWeekBoardEmbed(meetings) {
    const nextWeekStart = now().add(1, 'week').startOf('isoWeek');
    const nextWeekEnd = now().add(1, 'week').endOf('isoWeek');

    const embed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.PRIMARY)
      .setTitle(`📆 下週會議 (${nextWeekStart.format('MM/DD')} - ${nextWeekEnd.format('MM/DD')})`)
      .setTimestamp();

    if (meetings.length === 0) {
      embed.setDescription('下週沒有會議 🎉');
      embed.setFooter({ text: 'Meeting Bot • 每日 00:00 自動更新' });
      return embed;
    }

    // 按日期分組
    const meetingsByDay = {};

    for (const meeting of meetings) {
      const startTime = createDate(meeting.startTime);
      const dayKey = startTime.format('YYYY-MM-DD');

      if (!meetingsByDay[dayKey]) {
        meetingsByDay[dayKey] = [];
      }

      meetingsByDay[dayKey].push(meeting);
    }

    let description = '';

    // 按日期順序顯示
    const sortedDays = Object.keys(meetingsByDay).sort();

    for (const dayKey of sortedDays) {
      const date = createDate(dayKey);
      const dayMeetings = meetingsByDay[dayKey];

      // 日期標題
      const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
      const dayTitle = `【${date.format('MM/DD')} 週${dayOfWeek}】`;

      description += `\n**${dayTitle}**\n`;

      // 排序會議
      const sortedMeetings = dayMeetings.sort((a, b) => {
        return createDate(a.startTime).isBefore(createDate(b.startTime)) ? -1 : 1;
      });

      for (const meeting of sortedMeetings) {
        const startTime = createDate(meeting.startTime);

        description += `🕐 ${startTime.format('HH:mm')} | ${meeting.type || '未設定'} | ${meeting.title || '未設定'}\n`;
        description += `   📍 ${meeting.location || '未設定'}\n`;

        if (meeting.participants.length > 0 && meeting.participants.length <= 5) {
          const participantMentions = meeting.participants
            .map(p => `<@${p.user_id}>`)
            .join(' ');
          description += `   👥 ${participantMentions}\n`;
        } else if (meeting.participants.length > 5) {
          description += `   👥 ${meeting.participants.length} 位參加者\n`;
        }

        description += '\n';
      }
    }

    embed.setDescription(description);
    embed.setFooter({
      text: `共 ${meetings.length} 場會議 • Meeting Bot • 每日 00:00 自動更新`
    });

    return embed;
  }
}

export default EmbedBuilderUtil;
