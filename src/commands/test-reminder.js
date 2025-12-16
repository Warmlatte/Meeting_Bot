import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import SendRemindersJob from '../jobs/send-reminders.js';

export default {
  data: new SlashCommandBuilder()
    .setName('test-reminder')
    .setDescription('測試提醒功能 (僅管理員)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 檢查權限
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ 此指令僅限管理員使用',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const reminderJob = new SendRemindersJob(interaction.client);
      await reminderJob.execute();

      await interaction.editReply({
        content: '✅ 提醒檢查已執行完成,請查看日誌',
      });
    } catch (error) {
      console.error('測試提醒失敗:', error);
      await interaction.editReply({
        content: `❌ 執行失敗: ${error.message}`,
      });
    }
  },
};
