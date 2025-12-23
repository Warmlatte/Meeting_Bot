import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import CONSTANTS from '../config/constants.js';
import dayjs from 'dayjs';

export default {
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

      // 建立會議列表 Embed
      const embed = new EmbedBuilder()
        .setColor(CONSTANTS.COLORS.PRIMARY)
        .setTitle(`📅 ${targetUser.username} 的會議`)
        .setDescription(`未來 30 天共有 ${meetings.length} 場會議\n${description}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      if (meetings.length > 10) {
        embed.setFooter({ text: `僅顯示前 10 場會議 • 共 ${meetings.length} 場 • Meeting Bot` });
      } else {
        embed.setFooter({ text: 'Meeting Bot' });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ 查詢用戶會議失敗:', error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        '查詢失敗',
        '無法取得用戶會議，請稍後再試'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
