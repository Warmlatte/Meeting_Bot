import CalendarService from '../services/calendar.js';
import EmbedBuilderUtil from '../utils/embed-builder.js';
import reminderTracker from '../utils/reminder-tracker.js';
import dayjs from 'dayjs';

/**
 * 發送會議提醒任務
 */
class SendRemindersJob {
  constructor(client) {
    this.client = client;
    this.calendarService = new CalendarService();
  }

  /**
   * 執行提醒任務
   */
  async execute() {
    console.log('[SendRemindersJob] 開始檢查會議提醒...');

    try {
      // 查詢未來 3 小時內的會議
      const now = dayjs();
      const timeMin = now.toISOString();
      const timeMax = now.add(3, 'hour').toISOString();

      const events = await this.calendarService.listMeetings(timeMin, timeMax);

      if (events.length === 0) {
        console.log('[SendRemindersJob] 沒有需要提醒的會議');
        return;
      }

      console.log(`[SendRemindersJob] 找到 ${events.length} 個即將到來的會議`);

      for (const event of events) {
        const meeting = this.calendarService.parseMeetingEvent(event);
        await this.checkAndSendReminder(meeting);
      }

      console.log('[SendRemindersJob] 提醒檢查完成');
    } catch (error) {
      console.error('[SendRemindersJob] 執行失敗:', error);
    }
  }

  /**
   * 檢查並發送提醒
   * @param {Object} meeting - 會議資料
   */
  async checkAndSendReminder(meeting) {
    const now = dayjs();
    const startTime = dayjs(meeting.startTime);
    const minutesUntilStart = startTime.diff(now, 'minute');

    // 2 小時前提醒 (100-140 分鐘之間,考慮任務執行間隔)
    // 約 1 小時 40 分鐘 ~ 2 小時 20 分鐘
    if (minutesUntilStart >= 100 && minutesUntilStart <= 140) {
      await this.sendReminder(meeting, '2h');
    }
  }

  /**
   * 發送提醒
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型
   */
  async sendReminder(meeting, reminderType) {
    // 檢查是否已發送過
    if (reminderTracker.hasReminded(meeting.id, reminderType)) {
      console.log(`[SendRemindersJob] 會議 ${meeting.id} 的 ${reminderType} 提醒已發送過`);
      return;
    }

    console.log(`[SendRemindersJob] 發送 ${reminderType} 提醒: ${meeting.title}`);

    const reminderEmbed = EmbedBuilderUtil.createReminderEmbed(meeting, reminderType);

    // 發送 DM 給所有參加者
    let successCount = 0;
    let failCount = 0;

    for (const participant of meeting.participants) {
      try {
        const user = await this.client.users.fetch(participant.user_id);
        await user.send({ embeds: [reminderEmbed] });
        successCount++;
        console.log(`[SendRemindersJob] ✅ 已發送提醒給 ${participant.name} (${participant.user_id})`);
      } catch (error) {
        failCount++;
        console.error(`[SendRemindersJob] ❌ 無法發送提醒給 ${participant.name}:`, error.message);
      }
    }

    // 標記為已提醒
    reminderTracker.markAsReminded(meeting.id, reminderType);

    console.log(`[SendRemindersJob] 提醒發送完成: 成功 ${successCount}, 失敗 ${failCount}`);
  }

  /**
   * 發送頻道提醒 (可選功能)
   * @param {Object} meeting - 會議資料
   * @param {string} reminderType - 提醒類型
   */
  async sendChannelReminder(meeting, reminderType) {
    if (!meeting.discordInfo || !meeting.discordInfo.channel_id) {
      console.log('[SendRemindersJob] 沒有頻道資訊,跳過頻道提醒');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(meeting.discordInfo.channel_id);
      const reminderText = EmbedBuilderUtil.createChannelReminderText(meeting, reminderType);
      await channel.send(reminderText);
      console.log(`[SendRemindersJob] ✅ 已在頻道 ${channel.name} 發送提醒`);
    } catch (error) {
      console.error('[SendRemindersJob] ❌ 無法發送頻道提醒:', error.message);
    }
  }
}

export default SendRemindersJob;
