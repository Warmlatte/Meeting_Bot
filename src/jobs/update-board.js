import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import boardManager from '../utils/board-manager.js';
import config from '../config/env.js';
import { getTodayStart, getTodayEnd, getThisWeekStart, getThisWeekEnd, getNextWeekStart, getNextWeekEnd } from '../utils/date-utils.js';

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

      // 更新下週會議
      await this.updateNextWeekBoard(channel);

      console.log('[UpdateBoardJob] ✅ 布告欄更新完成');
    } catch (error) {
      console.error('[UpdateBoardJob] 更新失敗:', error);
    }

    // 更新場地布告欄（如有設定頻道）
    await this.executeVenueBoard();
  }

  /**
   * 執行場地布告欄更新
   */
  async executeVenueBoard() {
    if (!config.discord.venueBoardChannelId) {
      return; // 未設定場地布告欄頻道，跳過
    }

    try {
      const venueChannel = await this.client.channels.fetch(config.discord.venueBoardChannelId);
      if (!venueChannel) {
        console.error('[UpdateBoardJob] 找不到場地布告欄頻道');
        return;
      }

      await this.updateVenueTodayBoard(venueChannel);
      await this.updateVenueWeekBoard(venueChannel);

      console.log('[UpdateBoardJob] ✅ 場地布告欄更新完成');
    } catch (error) {
      console.error('[UpdateBoardJob] 場地布告欄更新失敗:', error);
    }
  }

  /**
   * 更新今日會議布告欄
   */
  async updateTodayBoard(channel) {
    console.log('[UpdateBoardJob] 更新今日會議...');

    // 查詢今日會議
    const timeMin = getTodayStart();
    const timeMax = getTodayEnd();

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
    const timeMin = getThisWeekStart();
    const timeMax = getThisWeekEnd();

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
   * 更新下週會議布告欄
   */
  async updateNextWeekBoard(channel) {
    console.log('[UpdateBoardJob] 更新下週會議...');

    // 查詢下週會議
    const timeMin = getNextWeekStart();
    const timeMax = getNextWeekEnd();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const meetings = events.map(event => this.calendarService.parseMeetingEvent(event));

    const embed = EmbedBuilderUtil.createNextWeekBoardEmbed(meetings);

    // 更新或建立訊息
    const messageId = boardManager.getNextWeekMessageId();

    try {
      if (messageId) {
        // 嘗試更新現有訊息
        const message = await channel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新下週會議訊息');
      } else {
        // 建立新訊息
        const message = await channel.send({ embeds: [embed] });
        boardManager.setNextWeekMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立下週會議訊息');
      }
    } catch (error) {
      // 訊息可能被刪除,重新建立
      console.log('[UpdateBoardJob] 舊訊息不存在,建立新訊息...');
      const message = await channel.send({ embeds: [embed] });
      boardManager.setNextWeekMessageId(message.id);
      console.log('[UpdateBoardJob] ✅ 已重新建立下週會議訊息');
    }
  }

  /**
   * 更新場地布告欄今日
   */
  async updateVenueTodayBoard(venueChannel) {
    console.log('[UpdateBoardJob] 更新場地布告欄今日...');

    const timeMin = getTodayStart();
    const timeMax = getTodayEnd();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const trbSlots = events.filter(e => e.location && e.location.toUpperCase().includes('TRB'));

    const embed = EmbedBuilderUtil.createVenueBoardTodayEmbed(trbSlots);
    const messageId = boardManager.getVenueTodayMessageId();

    try {
      if (messageId) {
        const message = await venueChannel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新場地布告欄今日訊息');
      } else {
        const message = await venueChannel.send({ embeds: [embed] });
        boardManager.setVenueTodayMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立場地布告欄今日訊息');
      }
    } catch (error) {
      console.log('[UpdateBoardJob] 場地布告欄今日舊訊息不存在,重新建立...');
      const message = await venueChannel.send({ embeds: [embed] });
      boardManager.setVenueTodayMessageId(message.id);
    }
  }

  /**
   * 更新場地布告欄本週
   */
  async updateVenueWeekBoard(venueChannel) {
    console.log('[UpdateBoardJob] 更新場地布告欄本週...');

    const timeMin = getThisWeekStart();
    const timeMax = getThisWeekEnd();

    const events = await this.calendarService.listMeetings(timeMin, timeMax);
    const trbSlots = events.filter(e => e.location && e.location.toUpperCase().includes('TRB'));

    const embed = EmbedBuilderUtil.createVenueBoardWeekEmbed(trbSlots);
    const messageId = boardManager.getVenueWeekMessageId();

    try {
      if (messageId) {
        const message = await venueChannel.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log('[UpdateBoardJob] ✅ 已更新場地布告欄本週訊息');
      } else {
        const message = await venueChannel.send({ embeds: [embed] });
        boardManager.setVenueWeekMessageId(message.id);
        console.log('[UpdateBoardJob] ✅ 已建立場地布告欄本週訊息');
      }
    } catch (error) {
      console.log('[UpdateBoardJob] 場地布告欄本週舊訊息不存在,重新建立...');
      const message = await venueChannel.send({ embeds: [embed] });
      boardManager.setVenueWeekMessageId(message.id);
    }
  }

  /**
   * 即時更新布告欄 (會議新增/修改/取消時呼叫)
   */
  async quickUpdate() {
    console.log('[UpdateBoardJob] 執行即時更新...');
    await this.execute();
  }

  /**
   * 即時更新場地布告欄
   */
  async quickVenueUpdate() {
    console.log('[UpdateBoardJob] 執行場地布告欄即時更新...');
    await this.executeVenueBoard();
  }
}

export default UpdateBoardJob;
