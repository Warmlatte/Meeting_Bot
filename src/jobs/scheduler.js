import cron from 'node-cron';
import SendRemindersJob from './send-reminders.js';

/**
 * 任務調度器
 */
class Scheduler {
  constructor(client) {
    this.client = client;
    this.jobs = [];
  }

  /**
   * 啟動所有定時任務
   */
  start() {
    console.log('[Scheduler] 啟動定時任務調度器...');

    // 每 10 分鐘檢查並發送會議提醒
    const reminderJob = cron.schedule('*/10 * * * *', async () => {
      console.log('[Scheduler] 執行提醒任務 (每 10 分鐘)');
      const sendRemindersJob = new SendRemindersJob(this.client);
      await sendRemindersJob.execute();
    });

    this.jobs.push({ name: 'send-reminders', job: reminderJob });

    console.log(`[Scheduler] ✅ 已啟動 ${this.jobs.length} 個定時任務`);
    this.logSchedule();
  }

  /**
   * 停止所有定時任務
   */
  stop() {
    console.log('[Scheduler] 停止所有定時任務...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`[Scheduler] ✅ 已停止任務: ${name}`);
    });
  }

  /**
   * 手動執行特定任務 (用於測試)
   * @param {string} jobName - 任務名稱
   */
  async runJob(jobName) {
    console.log(`[Scheduler] 手動執行任務: ${jobName}`);

    switch (jobName) {
      case 'send-reminders':
        const sendRemindersJob = new SendRemindersJob(this.client);
        await sendRemindersJob.execute();
        break;

      default:
        console.log(`[Scheduler] ❌ 找不到任務: ${jobName}`);
    }
  }

  /**
   * 列出任務排程
   */
  logSchedule() {
    console.log('\n[Scheduler] 定時任務排程:');
    console.log('  • send-reminders: 每 10 分鐘 (*/10 * * * *)');
    console.log('');
  }
}

export default Scheduler;
