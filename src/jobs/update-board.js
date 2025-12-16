import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import boardManager from '../utils/board-manager.js';
import config from '../config/env.js';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

// 載入 dayjs 插件
dayjs.extend(isoWeek);

/**
 * 更新布告欄任務
 */
class UpdateBoardJob {
  constructor(client) {
    this.client = client;
    this.calendarService = new CalendarService();
  }

  /**
   * 執行更新任務
   */
  async execute() {
    console.log('[UpdateBoardJob] 開始更新布告欄...');

    try {
      const channel = await this.client.channels.fetch(config.discord.boardChannelId);

      if (!channel) {
        console.error('[UpdateBoardJob] 找不到布告欄頻道');
        return;
      }

      // 更新今日會議
      await this.updateTodayBoard(channel);

      // 更新本週會議
      await this.updateWeekBoard(channel);

      console.log('[UpdateBoardJob] ✅ 布告欄更新完成');
    } catch (error) {
      console.error('[UpdateBoardJob] 更新失敗:', error);
    }
  }

  /**
   * 更新今日會議布告欄
   */
  async updateTodayBoard(channel) {
    console.log('[UpdateBoardJob] 更新今日會議...');

    // 查詢今日會議
    const timeMin = dayjs().startOf('day').toISOString();
    const timeMax = dayjs().endOf('day').toISOString();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const meetings = events.map(event => this.calendarService.parseMeetingEvent(event));

    const embed = EmbedBuilderUtil.createTodayBoardEmbed(meetings);

    // 更新或建立訊息
    const messageId = boardManager.getTodayMessageId();

    try {
      if (messageId) {
        // 嘗試更新現有訊息
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新今日會議訊息');
      } else {
        // 建立新訊息
        const message = await channel.send({ embeds: [embed] });
        boardManager.setTodayMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立今日會議訊息');
      }
    } catch (error) {
      // 訊息可能被刪除,重新建立
      console.log('[UpdateBoardJob] 舊訊息不存在,建立新訊息...');
      const message = await channel.send({ embeds: [embed] });
      boardManager.setTodayMessageId(message.id);
      console.log('[UpdateBoardJob] ✅ 已重新建立今日會議訊息');
    }
  }

  /**
   * 更新本週會議布告欄
   */
  async updateWeekBoard(channel) {
    console.log('[UpdateBoardJob] 更新本週會議...');

    // 查詢本週會議
    const timeMin = dayjs().startOf('isoWeek').toISOString();
    const timeMax = dayjs().endOf('isoWeek').toISOString();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const meetings = events.map(event => this.calendarService.parseMeetingEvent(event));

    const embed = EmbedBuilderUtil.createWeekBoardEmbed(meetings);

    // 更新或建立訊息
    const messageId = boardManager.getWeekMessageId();

    try {
      if (messageId) {
        // 嘗試更新現有訊息
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新本週會議訊息');
      } else {
        // 建立新訊息
        const message = await channel.send({ embeds: [embed] });
        boardManager.setWeekMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立本週會議訊息');
      }
    } catch (error) {
      // 訊息可能被刪除,重新建立
      console.log('[UpdateBoardJob] 舊訊息不存在,建立新訊息...');
      const message = await channel.send({ embeds: [embed] });
      boardManager.setWeekMessageId(message.id);
      console.log('[UpdateBoardJob] ✅ 已重新建立本週會議訊息');
    }
  }

  /**
   * 即時更新布告欄 (會議新增/修改/取消時呼叫)
   */
  async quickUpdate() {
    console.log('[UpdateBoardJob] 執行即時更新...');
    await this.execute();
  }
}

export default UpdateBoardJob;
