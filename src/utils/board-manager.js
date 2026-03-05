import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 布告欄管理器
 * 管理布告欄訊息 ID 的儲存與讀取
 */
class BoardManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data/board-messages.json');
    this.data = this.load();
  }

  /**
   * 載入資料
   */
  load() {
    try {
      // 確保 data 目錄存在
      const dataDir = path.dirname(this.dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('[BoardManager] 載入資料失敗:', error);
    }

    return {
      todayMessageId: null,
      weekMessageId: null,
      nextWeekMessageId: null,
      venueTodayMessageId: null,
      venueWeekMessageId: null,
      venueNextWeekMessageId: null,
      lastUpdate: null,
    };
  }

  /**
   * 儲存資料
   */
  save() {
    try {
      const dataDir = path.dirname(this.dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('[BoardManager] 儲存資料失敗:', error);
    }
  }

  /**
   * 取得今日會議訊息 ID
   */
  getTodayMessageId() {
    return this.data.todayMessageId;
  }

  /**
   * 設定今日會議訊息 ID
   */
  setTodayMessageId(messageId) {
    this.data.todayMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得本週會議訊息 ID
   */
  getWeekMessageId() {
    return this.data.weekMessageId;
  }

  /**
   * 設定本週會議訊息 ID
   */
  setWeekMessageId(messageId) {
    this.data.weekMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得下週會議訊息 ID
   */
  getNextWeekMessageId() {
    return this.data.nextWeekMessageId;
  }

  /**
   * 設定下週會議訊息 ID
   */
  setNextWeekMessageId(messageId) {
    this.data.nextWeekMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得場地布告欄今日訊息 ID
   */
  getVenueTodayMessageId() {
    return this.data.venueTodayMessageId;
  }

  /**
   * 設定場地布告欄今日訊息 ID
   */
  setVenueTodayMessageId(messageId) {
    this.data.venueTodayMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得場地布告欄本週訊息 ID
   */
  getVenueWeekMessageId() {
    return this.data.venueWeekMessageId;
  }

  /**
   * 設定場地布告欄本週訊息 ID
   */
  setVenueWeekMessageId(messageId) {
    this.data.venueWeekMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 取得場地布告欄下週訊息 ID
   */
  getVenueNextWeekMessageId() {
    return this.data.venueNextWeekMessageId;
  }

  /**
   * 設定場地布告欄下週訊息 ID
   */
  setVenueNextWeekMessageId(messageId) {
    this.data.venueNextWeekMessageId = messageId;
    this.data.lastUpdate = new Date().toISOString();
    this.save();
  }

  /**
   * 重置所有訊息 ID (用於重建布告欄)
   */
  reset() {
    this.data = {
      todayMessageId: null,
      weekMessageId: null,
      nextWeekMessageId: null,
      venueTodayMessageId: null,
      venueWeekMessageId: null,
      venueNextWeekMessageId: null,
      lastUpdate: null,
    };
    this.save();
  }

  /**
   * 取得最後更新時間
   */
  getLastUpdate() {
    return this.data.lastUpdate;
  }
}

// 單例模式
const boardManager = new BoardManager();

export default boardManager;
