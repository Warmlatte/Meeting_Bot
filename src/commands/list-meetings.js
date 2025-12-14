import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(isoWeek);

// 儲存分頁資料 (使用 Map,key 為 messageId)
export const paginationData = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('list-meetings')
    .setDescription('列出會議清單'),

  async execute(interaction) {
    // 建立篩選選單
    const filterSelect = new StringSelectMenuBuilder()
      .setCustomId('meeting_list_filter')
      .setPlaceholder('選擇時間範圍')
      .addOptions([
        {
          label: '今日會議',
          value: 'today',
          description: '顯示今天的所有會議',
          emoji: '📅',
        },
        {
          label: '本週會議',
          value: 'this_week',
          description: '顯示本週的所有會議',
          emoji: '📆',
        },
        {
          label: '本月會議',
          value: 'this_month',
          description: '顯示本月的所有會議',
          emoji: '🗓️',
        },
      ]);

    await interaction.reply({
      content: '請選擇要查詢的時間範圍:',
      components: [new ActionRowBuilder().addComponents(filterSelect)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

/**
 * 處理篩選選擇
 */
export async function handleFilterSelection(interaction) {
  await interaction.deferUpdate();

  const filterType = interaction.values[0];
  const { timeMin, timeMax } = getTimeRange(filterType);

  try {
    const calendarService = new CalendarService();
    const events = await calendarService.listMeetings(timeMin, timeMax);

    // 解析會議資料
    const meetings = events.map(event => calendarService.parseMeetingEvent(event));

    if (meetings.length === 0) {
      const emptyEmbed = EmbedBuilderUtil.createEmptyMeetingListEmbed(filterType);
      await interaction.editReply({
        content: null,
        embeds: [emptyEmbed],
        components: [],
      });
      return;
    }

    // 建立分頁
    const totalPages = Math.ceil(meetings.length / 5);
    const currentPage = 1;

    const embed = EmbedBuilderUtil.createMeetingListEmbed(
      meetings,
      filterType,
      currentPage,
      totalPages
    );

    const components = [];

    // 如果有多頁,顯示分頁按鈕
    if (totalPages > 1) {
      const paginationButtons = createPaginationButtons(currentPage, totalPages);
      components.push(paginationButtons);
    }

    const reply = await interaction.editReply({
      content: null,
      embeds: [embed],
      components: components,
    });

    // 儲存分頁資料
    if (totalPages > 1) {
      paginationData.set(reply.id, {
        meetings,
        filterType,
        currentPage,
        totalPages,
        userId: interaction.user.id,
      });

      // 30 分鐘後清除資料
      setTimeout(() => {
        paginationData.delete(reply.id);
      }, 30 * 60 * 1000);
    }
  } catch (error) {
    console.error('查詢會議失敗:', error);
    const errorEmbed = EmbedBuilderUtil.createErrorEmbed(
      '查詢失敗',
      '無法取得會議列表,請稍後再試'
    );
    await interaction.editReply({
      content: null,
      embeds: [errorEmbed],
      components: [],
    });
  }
}

/**
 * 處理分頁按鈕
 */
export async function handlePaginationButton(interaction) {
  const data = paginationData.get(interaction.message.id);

  if (!data) {
    await interaction.reply({
      content: '❌ 分頁資料已過期,請重新查詢',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 檢查是否為原始使用者
  if (data.userId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ 只有查詢者可以操作分頁',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();

  // 更新頁碼
  if (interaction.customId === 'meeting_list_prev') {
    data.currentPage = Math.max(1, data.currentPage - 1);
  } else if (interaction.customId === 'meeting_list_next') {
    data.currentPage = Math.min(data.totalPages, data.currentPage + 1);
  }

  // 更新 Embed
  const embed = EmbedBuilderUtil.createMeetingListEmbed(
    data.meetings,
    data.filterType,
    data.currentPage,
    data.totalPages
  );

  const paginationButtons = createPaginationButtons(data.currentPage, data.totalPages);

  await interaction.editReply({
    embeds: [embed],
    components: [paginationButtons],
  });

  // 更新儲存的資料
  paginationData.set(interaction.message.id, data);
}

/**
 * 建立分頁按鈕
 */
function createPaginationButtons(currentPage, totalPages) {
  const prevButton = new ButtonBuilder()
    .setCustomId('meeting_list_prev')
    .setLabel('上一頁')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️')
    .setDisabled(currentPage === 1);

  const pageIndicator = new ButtonBuilder()
    .setCustomId('meeting_list_page_indicator')
    .setLabel(`${currentPage} / ${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId('meeting_list_next')
    .setLabel('下一頁')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('➡️')
    .setDisabled(currentPage === totalPages);

  return new ActionRowBuilder().addComponents(prevButton, pageIndicator, nextButton);
}

/**
 * 取得時間範圍
 */
function getTimeRange(filterType) {
  let timeMin, timeMax;

  switch (filterType) {
    case 'today':
      timeMin = dayjs().startOf('day').toISOString();
      timeMax = dayjs().endOf('day').toISOString();
      break;

    case 'this_week':
      timeMin = dayjs().startOf('isoWeek').toISOString();
      timeMax = dayjs().endOf('isoWeek').toISOString();
      break;

    case 'this_month':
      timeMin = dayjs().startOf('month').toISOString();
      timeMax = dayjs().endOf('month').toISOString();
      break;

    default:
      timeMin = dayjs().startOf('day').toISOString();
      timeMax = dayjs().endOf('day').toISOString();
  }

  return { timeMin, timeMax };
}
