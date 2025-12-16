import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 取得當前檔案的目錄路徑 (ES Modules 中需要手動處理 __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入 .env 檔案
dotenv.config({ path: resolve(__dirname, '../../.env') });

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
    throw new Error(`❌ 缺少必要的環境變數: ${missing.join(', ')}`);
  }

  // 檢查 Google API 配置 (警告但不中斷)
  const googleRequired = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_CALENDAR_ID',
  ];

  const googleMissing = googleRequired.filter(key => !process.env[key]);

  if (googleMissing.length > 0) {
    console.log(`⚠️ 警告: Google API 環境變數未設定: ${googleMissing.join(', ')}`);
    console.log('   部分功能可能無法使用');
  }

  console.log('✅ 環境變數驗證成功');
}

// 啟動時驗證環境變數
validateEnv();

export default config;
