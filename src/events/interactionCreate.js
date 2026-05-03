import { Events, MessageFlags } from 'discord.js';
import config from '../config/env.js';
import * as addMeetingHandlers from '../commands/add-meeting.js';
import * as listMeetingHandlers from '../commands/list-meetings.js';
import * as editMeetingHandlers from '../commands/edit-meeting.js';
import * as cancelMeetingHandlers from '../commands/cancel-meeting.js';
import * as rentVenueHandlers from '../commands/rent-venue.js';
import * as editRentalHandlers from '../commands/edit-rental.js';
import * as cancelRentalHandlers from '../commands/cancel-rental.js';
import * as listRentalsHandlers from '../commands/list-rentals.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Guild 白名單驗證：僅允許指定伺服器使用
    if (interaction.guildId !== config.discord.guildId) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ 此 Bot 僅限工作室使用',
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // 身份組白名單驗證：若有設定 ALLOWED_ROLE_IDS，只允許擁有指定身份組的成員
    const allowedRoleIds = config.discord.allowedRoleIds;
    if (allowedRoleIds.length > 0 && interaction.member) {
      const memberRoles = interaction.member.roles?.cache;
      const hasAllowedRole = memberRoles && allowedRoleIds.some(roleId => memberRoles.has(roleId));
      if (!hasAllowedRole) {
        if (interaction.isRepliable()) {
          await interaction.reply({
            content: '❌ 你沒有使用此 Bot 的權限',
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }
    }

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
      // list-rentals 選單
      else if (interaction.customId === 'rental_list_filter') {
        await listRentalsHandlers.handleFilterSelection(interaction);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'meeting_participants') {
        await addMeetingHandlers.handleParticipantsSelection(interaction);
      } else if (interaction.customId === 'edit_meeting_participants') {
        await editMeetingHandlers.handleParticipantsSelection(interaction);
      }
      // rent-venue 登記者選擇
      else if (interaction.customId === 'rental_registrar') {
        await rentVenueHandlers.handleRegistrarSelection(interaction);
      }
    }

    // 處理按鈕互動
    if (interaction.isButton()) {
      // add-meeting 按鈕
      if (interaction.customId === 'meeting_show_modal') {
        await addMeetingHandlers.showDetailsModal(interaction);
      } else if (interaction.customId === 'meeting_confirm_create') {
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
      // rent-venue 按鈕
      else if (interaction.customId === 'rental_show_modal') {
        await rentVenueHandlers.showDetailsModal(interaction);
      } else if (interaction.customId === 'rental_confirm_create') {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const data = rentVenueHandlers.tempRentalData.get(userId);
        if (data) {
          await rentVenueHandlers.createRental(interaction, data);
        }
      } else if (interaction.customId === 'rental_cancel_create') {
        await interaction.update({ content: '❌ 已取消租借登記', embeds: [], components: [] });
      }
      // edit-rental 按鈕
      else if (interaction.customId === 'edit_rental_open_modal') {
        await editRentalHandlers.handleOpenModal(interaction);
      } else if (interaction.customId === 'edit_rental_cancel_edit') {
        await editRentalHandlers.handleCancelEditButton(interaction);
      } else if (interaction.customId === 'edit_rental_confirm') {
        await editRentalHandlers.handleConfirmUpdate(interaction);
      } else if (interaction.customId === 'edit_rental_cancel') {
        await editRentalHandlers.handleCancelUpdate(interaction);
      }
      // cancel-rental 按鈕
      else if (interaction.customId.startsWith('cancel_rental_confirm_')) {
        const eventId = interaction.customId.replace('cancel_rental_confirm_', '');
        await cancelRentalHandlers.handleCancelConfirm(interaction, eventId);
      } else if (interaction.customId === 'cancel_rental_abort') {
        await cancelRentalHandlers.handleCancelAbort(interaction);
      }
      // list-rentals 分頁按鈕
      else if (interaction.customId === 'rental_list_prev' || interaction.customId === 'rental_list_next') {
        await listRentalsHandlers.handlePaginationButton(interaction);
      }
    }

    // 處理 Modal 提交
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'meeting_details_modal') {
        await addMeetingHandlers.handleModalSubmit(interaction);
      } else if (interaction.customId === 'edit_meeting_details_modal') {
        await editMeetingHandlers.handleModalSubmit(interaction);
      }
      // rent-venue modal
      else if (interaction.customId === 'rental_details_modal') {
        await rentVenueHandlers.handleModalSubmit(interaction);
      }
      // edit-rental modal
      else if (interaction.customId === 'edit_rental_modal') {
        await editRentalHandlers.handleModalSubmit(interaction);
      }
    }
  },
};
