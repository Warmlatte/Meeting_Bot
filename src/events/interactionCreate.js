import { Events, MessageFlags } from 'discord.js';
import * as addMeetingHandlers from '../commands/add-meeting.js';
import * as listMeetingHandlers from '../commands/list-meetings.js';
import * as editMeetingHandlers from '../commands/edit-meeting.js';
import * as cancelMeetingHandlers from '../commands/cancel-meeting.js';

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
      // add-meeting 選單
      if (interaction.customId === 'meeting_type') {
        await addMeetingHandlers.handleTypeSelection(interaction);
      }
      // list-meetings 選單
      else if (interaction.customId === 'meeting_list_filter') {
        await listMeetingHandlers.handleFilterSelection(interaction);
      }
      // edit-meeting 選單
      else if (interaction.customId === 'edit_meeting_type') {
        await editMeetingHandlers.handleTypeSelection(interaction);
      } else if (interaction.customId === 'edit_meeting_hour') {
        await editMeetingHandlers.handleHourSelection(interaction);
      } else if (interaction.customId === 'edit_meeting_minute') {
        await editMeetingHandlers.handleMinuteSelection(interaction);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'meeting_participants') {
        await addMeetingHandlers.handleParticipantsSelection(interaction);
      } else if (interaction.customId === 'edit_meeting_participants') {
        await editMeetingHandlers.handleParticipantsSelection(interaction);
      }
    }

    // 處理按鈕互動
    if (interaction.isButton()) {
      // add-meeting 按鈕
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
      }
      // list-meetings 按鈕
      else if (interaction.customId === 'meeting_list_prev' || interaction.customId === 'meeting_list_next') {
        await listMeetingHandlers.handlePaginationButton(interaction);
      }
      // edit-meeting 按鈕
      else if (interaction.customId === 'edit_meeting_show_modal') {
        await editMeetingHandlers.showDetailsModal(interaction);
      } else if (interaction.customId === 'edit_meeting_cancel') {
        await editMeetingHandlers.handleCancelEdit(interaction);
      }
      // cancel-meeting 按鈕
      else if (interaction.customId.startsWith('cancel_meeting_confirm_')) {
        const meetingId = interaction.customId.replace('cancel_meeting_confirm_', '');
        await cancelMeetingHandlers.handleCancelConfirm(interaction, meetingId);
      } else if (interaction.customId === 'cancel_meeting_abort') {
        await cancelMeetingHandlers.handleCancelAbort(interaction);
      }
    }

    // 處理 Modal 提交
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'meeting_details_modal') {
        await addMeetingHandlers.handleModalSubmit(interaction);
      } else if (interaction.customId === 'edit_meeting_details_modal') {
        await editMeetingHandlers.handleModalSubmit(interaction);
      }
    }
  },
};
