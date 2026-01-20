import { parseDate as parseDateWithTimezone } from '../utils/date-utils.js';

/**
 * 日期時間解析器
 */
class Parser {
  /**
   * 解析日期格式
   * 支援: 25/10/7, 25/10/07, 2025.10.07, 2025-10-07, 20251216
   * @param {string} dateStr - 日期字串
   * @returns {string} - 標準格式日期 (YYYY-MM-DD)
   */
  static parseDate(dateStr) {
    // 處理 20251216 (8位數字格式 YYYYMMDD)
    if (/^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}`;
    }

    // 處理 25/10/7 或 25/10/07
    if (/^\d{2}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/');
      return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // 處理 2025.10.07
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      return dateStr.replace(/\./g, '-');
    }

    // 已是標準格式 2025-10-07
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr;
  }

  /**
   * 解析時間格式
   * 支援: 1400, 13:00, 13：00 (中文冒號)
   * @param {string} timeStr - 時間字串
   * @returns {string} - 標準格式時間 (HH:MM)
   */
  static parseTime(timeStr) {
    // 處理中文冒號
    timeStr = timeStr.replace('：', ':');

    // 處理 HHMM 格式 (4位數字，無冒號)
    if (/^\d{4}$/.test(timeStr)) {
      const hour = timeStr.substring(0, 2);
      const minute = timeStr.substring(2, 4);
      return `${hour}:${minute}`;
    }

    // 處理 HMM 格式 (3位數字，如 930 代表 09:30)
    if (/^\d{3}$/.test(timeStr)) {
      const hour = timeStr.substring(0, 1);
      const minute = timeStr.substring(1, 3);
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    // 驗證並格式化 HH:MM
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hour, minute] = timeStr.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    return timeStr;
  }

  /**
   * 組合日期時間 (使用 Asia/Taipei 時區)
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} time - 時間 (HH:MM)
   * @returns {Object} - dayjs 物件 (已設定時區)
   */
  static combineDateTime(date, time) {
    // 使用 date-utils 的 parseDate 確保正確的時區
    return parseDateWithTimezone(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  }
}

export default Parser;
