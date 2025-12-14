import { Events, MessageFlags } from 'discord.js';
import * as addMeetingHandlers from '../commands/add-meeting.js';
import * as listMeetingHandlers from '../commands/list-meetings.js';

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
          flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // 處理選單互動
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'meeting_type') {
        await addMeetingHandlers.handleTypeSelection(interaction);
      } else if (interaction.customId === 'meeting_list_filter') {
        await listMeetingHandlers.handleFilterSelection(interaction);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'meeting_participants') {
        await addMeetingHandlers.handleParticipantsSelection(interaction);
      }
    }

    // 處理按鈕互動
    if (interaction.isButton()) {
      if (interaction.customId === 'meeting_show_modal') {
        await addMeetingHandlers.showDetailsModal(interaction);
      } else if (interaction.customId === 'meeting_confirm_create') {
        // 取得儲存的資料並建立會議
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const data = addMeetingHandlers.tempMeetingData.get(userId);
        if (data) {
          await addMeetingHandlers.createMeeting(interaction, data);
        }
      } else if (interaction.customId === 'meeting_cancel_create') {
        await interaction.update({
          content: '❌ 已取消建立會議',
          embeds: [],
          components: [],
        });
      } else if (interaction.customId === 'meeting_list_prev' || interaction.customId === 'meeting_list_next') {
        await listMeetingHandlers.handlePaginationButton(interaction);
      }
    }

    // 處理 Modal 提交 (add-meeting)
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'meeting_details_modal') {
        await addMeetingHandlers.handleModalSubmit(interaction);
      }
    }
  },
};
