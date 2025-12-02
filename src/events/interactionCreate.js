import { Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // 處理斜線指令
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ 找不到指令: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ 執行指令時發生錯誤:`, error);

        const errorMessage = {
          content: '執行指令時發生錯誤!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // 處理按鈕互動
    if (interaction.isButton()) {
      // 將在後續實作
      console.log(`🔘 按鈕互動: ${interaction.customId}`);
    }

    // 處理選單互動
    if (interaction.isStringSelectMenu()) {
      // 將在後續實作
      console.log(`📋 選單互動: ${interaction.customId}`);
    }

    // 處理 Modal 提交
    if (interaction.isModalSubmit()) {
      // 將在後續實作
      console.log(`📝 Modal 提交: ${interaction.customId}`);
    }
  },
};
