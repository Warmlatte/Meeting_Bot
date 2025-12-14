/**
 * 應用程式常數定義
 */
const CONSTANTS = {
  // Bot 設定
  BOT_NAME: 'Meeting Bot',
  BOT_VERSION: '1.0.0',

  // 會議類型
  MEETING_TYPES: {
    ONLINE: '線上會議',
    OFFLINE: '線下會議',
  },

  // 預設值
  DEFAULTS: {
    MEETING_DURATION: 2, // 預設會議時長(小時)
    ONLINE_LOCATION: 'DC',
  },

  // 顏色代碼 (用於 Embed)
  COLORS: {
    SUCCESS: 0x00ff00,  // 綠色
    ERROR: 0xff0000,    // 紅色
    INFO: 0x0099ff,     // 藍色
    WARNING: 0xffaa00,  // 橙色
    PRIMARY: 0x5865f2,  // Discord 紫色
  },
};

export default CONSTANTS;
