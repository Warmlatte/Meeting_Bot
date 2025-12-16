import cron from 'node-cron';
import SendRemindersJob from './send-reminders.js';
import UpdateBoardJob from './update-board.js';

/**
 * 任務調度器
 */
class Scheduler {
  constructor(client) {
    this.client = client;
    this.jobs = [];
    this.updateBoardJob = new UpdateBoardJob(client); // 儲存實例以供手動呼叫
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

    // 每日 00:00 更新布告欄
    const boardJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Scheduler] 執行布告欄更新 (每日 00:00)');
      await this.updateBoardJob.execute();
    });

    this.jobs.push({ name: 'update-board', job: boardJob });

    console.log(`[Scheduler] ✅ 已啟動 ${this.jobs.length} 個定時任務`);
    this.logSchedule();

    // Bot 啟動時立即更新一次布告欄
    setTimeout(async () => {
      console.log('[Scheduler] 執行初始布告欄更新...');
      await this.updateBoardJob.execute();
    }, 5000); // 延遲 5 秒確保 Bot 完全啟動
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

      case 'update-board':
        await this.updateBoardJob.execute();
        break;

      default:
        console.log(`[Scheduler] ❌ 找不到任務: ${jobName}`);
    }
  }

  /**
   * 即時更新布告欄 (供外部呼叫)
   */
  async triggerBoardUpdate() {
    await this.updateBoardJob.quickUpdate();
  }

  /**
   * 列出任務排程
   */
  logSchedule() {
    console.log('\n[Scheduler] 定時任務排程:');
    console.log('  • send-reminders: 每 10 分鐘 (*/10 * * * *)');
    console.log('  • update-board: 每日 00:00 (0 0 * * *)');
    console.log('');
  }
}

export default Scheduler;
