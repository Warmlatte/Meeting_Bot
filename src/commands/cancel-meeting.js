import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import CalendarService from "../services/calendar.js";
import EmbedBuilderUtil from "../utils/embed-builder.js";
import CONSTANTS from "../config/constants.js";
import { getRandomMeetingCancelSuccessImage } from "../config/images.js";
import { createDate } from "../utils/date-utils.js";

export default {
  data: new SlashCommandBuilder()
    .setName("cancel-meeting")
    .setDescription("取消會議")
    .addStringOption((option) =>
      option
        .setName("meeting_id")
        .setDescription("會議 ID (從 /user-meetings 或 /list-meetings 取得)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const meetingId = interaction.options.getString("meeting_id");
    const calendarService = new CalendarService();

    try {
      // 取得會議資料
      const meeting = await calendarService.getMeeting(meetingId);

      // 檢查權限 (只有建立者或管理員可以取消)
      const isCreator = meeting.discordInfo?.creator_id === interaction.user.id;
      const isAdmin = interaction.member.permissions.has("Administrator");

      if (!isCreator && !isAdmin) {
        const errorEmbed = new EmbedBuilder()
          .setColor(CONSTANTS.COLORS.ERROR)
          .setTitle("❌ 權限不足")
          .setDescription("你沒有權限取消此會議")
          .addFields(
            {
              name: "說明",
              value: "只有會議建立者或伺服器管理員可以取消會議",
              inline: false,
            },
            {
              name: "建立者",
              value: `<@${meeting.discordInfo?.creator_id || "未知"}>`,
              inline: true,
            },
            {
              name: "你的身份",
              value: `<@${interaction.user.id}>`,
              inline: true,
            }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      // 顯示確認對話框
      const startTime = createDate(meeting.startTime);
      const endTime = createDate(meeting.endTime);

      const confirmEmbed = new EmbedBuilder()
        .setColor(CONSTANTS.COLORS.WARNING)
        .setTitle("⚠️ 確認取消會議")
        .setDescription("你確定要取消以下會議嗎？**此操作無法復原**。")
        .addFields(
          {
            name: "📋 會議名稱",
            value: meeting.title || "未設定",
            inline: false,
          },
          {
            name: "📅 日期",
            value: startTime.format("YYYY-MM-DD (dddd)"),
            inline: true,
          },
          {
            name: "🕐 時間",
            value: `${startTime.format("HH:mm")} - ${endTime.format("HH:mm")}`,
            inline: true,
          },
          {
            name: "📍 地點",
            value: meeting.location || "未設定",
            inline: true,
          },
          {
            name: "👥 參加者",
            value: `${meeting.participants?.length || 0} 位`,
            inline: false,
          }
        )
        .setFooter({ text: "取消後，所有參加者將收到通知" })
        .setTimestamp();

      const confirmButton = new ButtonBuilder()
        .setCustomId(`cancel_meeting_confirm_${meetingId}`)
        .setLabel("確認取消")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("✅");

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_meeting_abort")
        .setLabel("取消操作")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌");

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [
          new ActionRowBuilder().addComponents(confirmButton, cancelButton),
        ],
      });
    } catch (error) {
      console.error("❌ 載入會議失敗:", error);
      const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
        "載入會議失敗",
        error.message || "找不到會議或會議已被刪除"
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

/**
 * 處理取消會議確認
 */
export async function handleCancelConfirm(interaction, meetingId) {
  await interaction.deferUpdate();

  try {
    const calendarService = new CalendarService();

    // 取得會議資料 (用於通知參加者)
    const meeting = await calendarService.getMeeting(meetingId);

    // 刪除會議
    await calendarService.deleteMeeting(meetingId);

    // 發送通知給所有參加者
    const notifyResult = await notifyParticipants(interaction.client, meeting);

    const successEmbed = new EmbedBuilder()
      .setColor(CONSTANTS.COLORS.SUCCESS)
      .setTitle("✅ 會議已取消")
      .setDescription(`已成功取消會議: **${meeting.title}**`)
      .addFields(
        {
          name: "📢 通知統計",
          value: `✅ 成功: ${notifyResult.success} 位\n❌ 失敗: ${notifyResult.fail} 位\n📊 總計: ${notifyResult.total} 位`,
          inline: false,
        },
        {
          name: "🗑️ 已移除",
          value: "會議已從 Google Calendar 中刪除",
          inline: false,
        }
      )
      .setTimestamp();

    // 加入隨機圖片
    const randomImage = getRandomMeetingCancelSuccessImage();
    if (randomImage) {
      successEmbed.setImage(randomImage);
    }

    // 先給取消者一個私人確認訊息
    await interaction.editReply({
      content: "✅ 會議已成功取消！",
      embeds: [],
      components: [],
    });

    // 在頻道發送公開的會議取消成功訊息
    await interaction.channel.send({ embeds: [successEmbed] });

    // 觸發布告欄即時更新
    const scheduler = interaction.client.scheduler;
    if (scheduler) {
      await scheduler.triggerBoardUpdate();
      // 若地點含 TRB，也更新場地布告欄
      if (meeting.location && meeting.location.toUpperCase().includes('TRB')) {
        await scheduler.triggerVenueBoardUpdate();
      }
      console.log("[CancelMeeting] 已觸發布告欄更新");
    }

    console.log(
      `[CancelMeeting] ✅ 會議已取消: ${meeting.title} (ID: ${meetingId})`
    );
  } catch (error) {
    console.error("❌ 取消會議失敗:", error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      "取消會議失敗",
      error.message
    );
    await interaction.editReply({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

/**
 * 處理取消操作
 */
export async function handleCancelAbort(interaction) {
  await interaction.update({
    content: "❌ 已取消操作，會議保持不變",
    embeds: [],
    components: [],
  });
}

/**
 * 通知參加者會議已取消
 */
async function notifyParticipants(client, meeting) {
  const startTime = createDate(meeting.startTime);
  const endTime = createDate(meeting.endTime);

  const cancelEmbed = new EmbedBuilder()
    .setColor(CONSTANTS.COLORS.ERROR)
    .setTitle("❌ 會議已取消")
    .setDescription("以下會議已被取消：")
    .addFields(
      { name: "📋 會議名稱", value: meeting.title || "未設定", inline: false },
      {
        name: "📅 原定日期",
        value: startTime.format("YYYY-MM-DD (dddd)"),
        inline: true,
      },
      {
        name: "🕐 原定時間",
        value: `${startTime.format("HH:mm")} - ${endTime.format("HH:mm")}`,
        inline: true,
      },
      { name: "📍 地點", value: meeting.location || "未設定", inline: true },
      {
        name: "💬 說明",
        value: "若有任何疑問，請聯絡會議建立者",
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ text: "Meeting Bot 通知" });

  let successCount = 0;
  let failCount = 0;
  const total = meeting.participants?.length || 0;

  if (!meeting.participants || meeting.participants.length === 0) {
    console.log("[CancelMeeting] ⚠️  沒有參加者需要通知");
    return { success: 0, fail: 0, total: 0 };
  }

  for (const participant of meeting.participants) {
    // 跳過沒有 Discord 帳號的參加者
    if (!participant.user_id || participant.name.includes("(無DC)")) {
      console.log(
        `[CancelMeeting] ⏭️  跳過無 Discord 帳號的參加者: ${participant.name}`
      );
      continue;
    }

    try {
      const user = await client.users.fetch(participant.user_id);
      await user.send({ embeds: [cancelEmbed] });
      successCount++;
      console.log(
        `[CancelMeeting] ✅ 已通知 ${participant.name} (${participant.user_id})`
      );

      // 延遲避免 Rate Limit
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      failCount++;
      console.error(
        `[CancelMeeting] ❌ 無法通知 ${participant.name}:`,
        error.message
      );
    }
  }

  console.log(
    `[CancelMeeting] 📊 通知發送完成: 成功 ${successCount}, 失敗 ${failCount}, 總計 ${total}`
  );

  return {
    success: successCount,
    fail: failCount,
    total: total,
  };
}
