import { google } from 'googleapis';
import readline from 'readline';

// 從環境變數或手動輸入取得
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '請填入你的Client ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '請填入你的Client Secret';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// 產生授權 URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('\n========================================');
console.log('📋 Google Calendar API - 取得 Refresh Token');
console.log('========================================\n');

console.log('步驟 1: 請在瀏覽器中開啟以下 URL:\n');
console.log(authUrl);
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('步驟 2: 授權後,請輸入授權碼: ', async (code) => {
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n========================================');
    console.log('✅ 成功取得 Refresh Token!');
    console.log('========================================\n');

    console.log('請將以下資訊加入 .env 檔案:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');

    if (tokens.access_token) {
      console.log('Access Token (用於測試):');
      console.log(tokens.access_token);
      console.log('');
    }

    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ 錯誤:', error.message);
    console.error('請確認授權碼是否正確\n');
  }
});
