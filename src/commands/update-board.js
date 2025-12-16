import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

/**
 * 手動更新布告欄指令 (管理員限定)
 */
export default {
  data: new SlashCommandBuilder()
    .setName('update-board')
    .setDescription('手動更新會議布告欄 (僅管理員)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 延遲回應
    await interaction.deferReply({ ephemeral: true });

    try {
      // 透過 client.scheduler 觸發布告欄更新
      if (!interaction.client.scheduler) {
        await interaction.editReply({
          content: '❌ 調度器未初始化,請稍後再試',
        });
        return;
      }

      await interaction.client.scheduler.triggerBoardUpdate();

      await interaction.editReply({
        content: '✅ 布告欄已更新完成',
      });
    } catch (error) {
      console.error('[UpdateBoard] 更新布告欄失敗:', error);
      await interaction.editReply({
        content: `❌ 更新失敗: ${error.message}`,
      });
    }
  },
};
