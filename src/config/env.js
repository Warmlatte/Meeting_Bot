const dotenv = require('dotenv');
const path = require('path');

// 載入 .env 檔案
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 環境變數配置
 */
const config = {
  // Discord 設定
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID,
    boardChannelId: process.env.BOARD_CHANNEL_ID,
  },

  // Google API 設定
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
  },

  // 環境設定
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TIMEZONE || 'Asia/Taipei',
};

/**
 * 驗證必要的環境變數
 */
function validateEnv() {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`缺少必要的環境變數: ${missing.join(', ')}`);
  }
}

// 啟動時驗證環境變數
validateEnv();

module.exports = config;
