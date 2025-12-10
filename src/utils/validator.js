import dayjs from 'dayjs';

/**
 * 資料驗證器
 */
class Validator {
  /**
   * 驗證會議資料
   * @param {Object} data - 會議資料
   * @returns {Array<string>} - 錯誤訊息陣列
   */
  static validateMeeting(data) {
    const errors = [];

    // 必填欄位
    if (!data.title || data.title.trim() === '') {
      errors.push('會議名稱為必填');
    }
    if (!data.date) {
      errors.push('會議日期為必填');
    }
    if (!data.time) {
      errors.push('會議時間為必填');
    }
    if (!data.type) {
      errors.push('會議類型為必填');
    }
    if (!data.location || data.location.trim() === '') {
      errors.push('會議地點為必填');
    }

    // 日期驗證
    if (data.date) {
      const meetingDate = dayjs(data.date);
      if (!meetingDate.isValid()) {
        errors.push('日期格式錯誤');
      } else if (meetingDate.isBefore(dayjs(), 'day')) {
        errors.push('會議日期不可為過去');
      }
    }

    // 時間驗證
    if (data.time && !/^\d{2}:\d{2}$/.test(data.time)) {
      errors.push('時間格式錯誤 (應為 HH:MM)');
    }

    // 標題長度
    if (data.title && data.title.length > 100) {
      errors.push('會議名稱不可超過 100 字元');
    }

    // 內容長度
    if (data.content && data.content.length > 1000) {
      errors.push('會議內容不可超過 1000 字元');
    }

    return errors;
  }

  /**
   * 驗證參加者
   * @param {Array} participants - 參加者陣列
   * @returns {Array<string>} - 錯誤訊息陣列
   */
  static validateParticipants(participants) {
    const errors = [];

    if (!Array.isArray(participants) || participants.length === 0) {
      errors.push('至少需要一位參加者');
    }

    if (participants && participants.length > 20) {
      errors.push('參加者不可超過 20 位');
    }

    return errors;
  }
}

export default Validator;
