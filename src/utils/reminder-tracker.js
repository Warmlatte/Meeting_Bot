/**
 * 提醒追蹤器
 * 追蹤已發送的提醒,避免重複發送
 */
class ReminderTracker {
  constructor() {
    // 儲存格式: { eventId-reminderType: timestamp }
    // reminderType: '2h' (2小時前) 或 '1d' (前一天)
    this.reminders = new Map();

    // 每天清理一次過期記錄 (超過 3 天的)
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * 檢查是否已發送提醒
   * @param {string} eventId - 會議 ID
   * @param {string} reminderType - 提醒類型 ('2h' 或 '1d')
   * @returns {boolean}
   */
  hasReminded(eventId, reminderType) {
    const key = `${eventId}-${reminderType}`;
    return this.reminders.has(key);
  }

  /**
   * 標記提醒已發送
   * @param {string} eventId - 會議 ID
   * @param {string} reminderType - 提醒類型
   */
  markAsReminded(eventId, reminderType) {
    const key = `${eventId}-${reminderType}`;
    this.reminders.set(key, Date.now());
  }

  /**
   * 清理過期記錄 (3 天前的)
   */
  cleanup() {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

    for (const [key, timestamp] of this.reminders.entries()) {
      if (timestamp < threeDaysAgo) {
        this.reminders.delete(key);
      }
    }

    console.log(`[ReminderTracker] 清理完成,剩餘 ${this.reminders.size} 筆記錄`);
  }

  /**
   * 取得提醒統計
   */
  getStats() {
    return {
      total: this.reminders.size,
      reminders: Array.from(this.reminders.entries()).map(([key, timestamp]) => ({
        key,
        timestamp: new Date(timestamp).toISOString(),
      })),
    };
  }
}

// 單例模式
const reminderTracker = new ReminderTracker();

export default reminderTracker;
