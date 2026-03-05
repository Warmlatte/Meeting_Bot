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
import { getTodayStart, getTodayEnd, getThisWeekStart, getThisWeekEnd, getThisMonthStart, getThisMonthEnd } from '../utils/date-utils.js';

// 儲存分頁狀態 (key: userId)
const rentalListState = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('list-rentals')
    .setDescription('列出場地租借清單'),

  async execute(interaction) {
    const filterSelect = new StringSelectMenuBuilder()
      .setCustomId('rental_list_filter')
      .setPlaceholder('選擇時間範圍')
      .addOptions([
        { label: '今日', value: 'today', emoji: '📅' },
        { label: '本週', value: 'this_week', emoji: '📆' },
        { label: '本月', value: 'this_month', emoji: '🗓️' },
      ]);

    await interaction.reply({
      content: '🏢 **場地租借清單** - 請選擇時間範圍:',
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
  let timeMin, timeMax;

  switch (filterType) {
    case 'today':
      timeMin = getTodayStart();
      timeMax = getTodayEnd();
      break;
    case 'this_week':
      timeMin = getThisWeekStart();
      timeMax = getThisWeekEnd();
      break;
    case 'this_month':
      timeMin = getThisMonthStart();
      timeMax = getThisMonthEnd();
      break;
    default:
      timeMin = getTodayStart();
      timeMax = getTodayEnd();
  }

  const calendarService = new CalendarService();
  const rentals = await calendarService.listRentals(timeMin, timeMax);

  const totalPages = Math.max(1, Math.ceil(rentals.length / 5));

  rentalListState.set(interaction.user.id, {
    rentals,
    filterType,
    page: 1,
    totalPages,
  });

  const embed = EmbedBuilderUtil.createRentalListEmbed(rentals, filterType, 1, totalPages);
  const components = buildPaginationComponents(filterType, 1, totalPages);

  await interaction.editReply({ content: null, embeds: [embed], components });
}

/**
 * 處理分頁按鈕
 */
export async function handlePaginationButton(interaction) {
  await interaction.deferUpdate();

  const userId = interaction.user.id;
  const state = rentalListState.get(userId);

  if (!state) {
    await interaction.editReply({ content: '❌ 請重新執行 /list-rentals', embeds: [], components: [] });
    return;
  }

  if (interaction.customId === 'rental_list_prev') {
    state.page = Math.max(1, state.page - 1);
  } else if (interaction.customId === 'rental_list_next') {
    state.page = Math.min(state.totalPages, state.page + 1);
  }

  rentalListState.set(userId, state);

  const embed = EmbedBuilderUtil.createRentalListEmbed(state.rentals, state.filterType, state.page, state.totalPages);
  const components = buildPaginationComponents(state.filterType, state.page, state.totalPages);

  await interaction.editReply({ embeds: [embed], components });
}

/**
 * 建立分頁按鈕
 */
function buildPaginationComponents(filterType, page, totalPages) {
  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId('rental_list_filter')
    .setPlaceholder('切換時間範圍')
    .addOptions([
      { label: '今日', value: 'today', emoji: '📅', default: filterType === 'today' },
      { label: '本週', value: 'this_week', emoji: '📆', default: filterType === 'this_week' },
      { label: '本月', value: 'this_month', emoji: '🗓️', default: filterType === 'this_month' },
    ]);

  const components = [new ActionRowBuilder().addComponents(filterSelect)];

  if (totalPages > 1) {
    const prevButton = new ButtonBuilder()
      .setCustomId('rental_list_prev')
      .setLabel('◀ 上一頁')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1);

    const nextButton = new ButtonBuilder()
      .setCustomId('rental_list_next')
      .setLabel('下一頁 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages);

    components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
  }

  return components;
}
