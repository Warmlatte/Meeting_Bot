import { google } from 'googleapis';
import config from './src/config/env.js';

console.log('\n🔍 Google Calendar API 認證診斷工具');
console.log('========================================\n');

// 檢查環境變數
console.log('📋 檢查環境變數設定:');
console.log(`   GOOGLE_CLIENT_ID: ${config.google.clientId ? '✅ 已設定' : '❌ 未設定'}`);
console.log(`   GOOGLE_CLIENT_SECRET: ${config.google.clientSecret ? '✅ 已設定' : '❌ 未設定'}`);
console.log(`   GOOGLE_REFRESH_TOKEN: ${config.google.refreshToken ? '✅ 已設定' : '❌ 未設定'}`);
console.log(`   GOOGLE_CALENDAR_ID: ${config.google.calendarId ? '✅ 已設定' : '❌ 未設定'}`);
console.log('');

if (!config.google.clientId || !config.google.clientSecret || !config.google.refreshToken || !config.google.calendarId) {
  console.log('❌ 缺少必要的環境變數,請先設定 .env 檔案\n');
  process.exit(1);
}

// 測試認證
async function testAuthentication() {
  console.log('🔐 測試 OAuth2 認證...\n');

  try {
    const auth = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    auth.setCredentials({
      refresh_token: config.google.refreshToken
    });

    // 嘗試取得 Access Token
    console.log('1️⃣ 正在取得 Access Token...');
    const accessTokenResponse = await auth.getAccessToken();

    if (accessTokenResponse.token) {
      console.log('   ✅ Access Token 取得成功!');
      console.log(`   Token (前20字元): ${accessTokenResponse.token.substring(0, 20)}...`);
    } else {
      console.log('   ❌ 無法取得 Access Token');
      return;
    }

    console.log('');

    // 測試 Calendar API 連線
    console.log('2️⃣ 測試 Calendar API 連線...');
    const calendar = google.calendar({ version: 'v3', auth });

    // 嘗試取得日曆資訊
    const calendarResponse = await calendar.calendars.get({
      calendarId: config.google.calendarId
    });

    console.log('   ✅ Calendar API 連線成功!');
    console.log(`   日曆名稱: ${calendarResponse.data.summary}`);
    console.log(`   時區: ${calendarResponse.data.timeZone}`);
    console.log('');

    // 測試列出事件
    console.log('3️⃣ 測試讀取事件權限...');
    const eventsResponse = await calendar.events.list({
      calendarId: config.google.calendarId,
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log('   ✅ 讀取事件成功!');
    console.log(`   找到 ${eventsResponse.data.items ? eventsResponse.data.items.length : 0} 個事件`);
    console.log('');

    console.log('========================================');
    console.log('🎉 所有認證測試通過!');
    console.log('========================================\n');
    console.log('您現在可以使用 Calendar API 了!');
    console.log('執行: node test-calendar.js 進行完整測試\n');

  } catch (error) {
    console.log('\n========================================');
    console.log('❌ 認證測試失敗!');
    console.log('========================================\n');

    console.log('錯誤詳情:');
    console.log(`   錯誤訊息: ${error.message}`);

    if (error.code) {
      console.log(`   錯誤代碼: ${error.code}`);
    }

    console.log('');
    console.log('💡 常見問題解決方案:\n');

    if (error.message.includes('invalid_grant') || error.code === 401) {
      console.log('🔧 問題: Refresh Token 無效或已過期');
      console.log('   解決方案:');
      console.log('   1. 確認 .env 中的 GOOGLE_REFRESH_TOKEN 是否正確');
      console.log('   2. 重新執行: node get-refresh-token.js');
      console.log('   3. 將新的 Refresh Token 更新到 .env 檔案');
      console.log('   4. 確保 OAuth 同意畫面狀態為「已發布」\n');
    } else if (error.message.includes('invalid_client')) {
      console.log('🔧 問題: Client ID 或 Client Secret 不正確');
      console.log('   解決方案:');
      console.log('   1. 檢查 .env 中的 GOOGLE_CLIENT_ID');
      console.log('   2. 檢查 .env 中的 GOOGLE_CLIENT_SECRET');
      console.log('   3. 確認這些值與 Google Cloud Console 中的憑證一致\n');
    } else if (error.message.includes('Calendar not found') || error.code === 404) {
      console.log('🔧 問題: Calendar ID 不正確或無權限存取');
      console.log('   解決方案:');
      console.log('   1. 檢查 .env 中的 GOOGLE_CALENDAR_ID');
      console.log('   2. 確認日曆 ID 正確 (通常是你的 email)');
      console.log('   3. 確認該日曆存在且可存取\n');
    } else {
      console.log('🔧 一般除錯步驟:');
      console.log('   1. 確認所有環境變數都已正確設定');
      console.log('   2. 重新取得 Refresh Token');
      console.log('   3. 檢查 Google Cloud Console 的 API 設定');
      console.log('   4. 確認 Google Calendar API 已啟用\n');
    }

    console.log('詳細錯誤資訊:');
    console.error(error);
    console.log('');
  }
}

testAuthentication();
