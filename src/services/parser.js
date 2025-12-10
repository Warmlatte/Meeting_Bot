import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);

/**
 * 日期時間解析器
 */
class Parser {
  /**
   * 解析日期格式
   * 支援: 25/10/7, 25/10/07, 2025.10.07, 2025-10-07
   * @param {string} dateStr - 日期字串
   * @returns {string} - 標準格式日期 (YYYY-MM-DD)
   */
  static parseDate(dateStr) {
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
   * 支援: 13:00, 13：00 (中文冒號)
   * @param {string} timeStr - 時間字串
   * @returns {string} - 標準格式時間 (HH:MM)
   */
  static parseTime(timeStr) {
    // 處理中文冒號
    timeStr = timeStr.replace('：', ':');

    // 驗證並格式化
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hour, minute] = timeStr.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    return timeStr;
  }

  /**
   * 組合日期時間
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} time - 時間 (HH:MM)
   * @returns {Object} - dayjs 物件
   */
  static combineDateTime(date, time) {
    return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  }
}

export default Parser;
