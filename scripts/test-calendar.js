#!/usr/bin/env node

/**
 * Google Calendar API 測試工具
 *
 * 功能:
 * 1. 驗證認證設定是否正確
 * 2. 測試 Calendar API 連線
 * 3. 列出今日會議
 *
 * 使用方法:
 * npm run test-calendar
 */

import CalendarService from '../src/services/calendar.js';
import dayjs from 'dayjs';
import config from '../src/config/env.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Google Calendar API 測試工具');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testCalendarConnection() {
  try {
    // 顯示當前配置
    console.log('📋 當前配置:');
    console.log(`   認證方式: ${config.google.authType || 'oauth'}`);
    console.log(`   日曆 ID: ${config.google.calendarId || '未設定'}`);

    if (config.google.authType === 'service_account') {
      console.log(`   Service Account 路徑: ${config.google.serviceAccountPath || '未設定'}`);
    } else {
      console.log(`   Client ID: ${config.google.clientId ? '已設定' : '未設定'}`);
      console.log(`   Client Secret: ${config.google.clientSecret ? '已設定' : '未設定'}`);
      console.log(`   Refresh Token: ${config.google.refreshToken ? '已設定' : '未設定'}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 步驟 1: 初始化 Calendar Service
    console.log('步驟 1/3: 初始化 Calendar Service...');
    const calendarService = new CalendarService();
    console.log('✅ Calendar Service 初始化成功\n');

    // 步驟 2: 測試 API 連線 - 查詢今日會議
    console.log('步驟 2/3: 測試 API 連線...');
    const today = dayjs().startOf('day');
    const tomorrow = dayjs().add(1, 'day').startOf('day');

    console.log(`   查詢時間: ${today.format('YYYY-MM-DD')} 至 ${tomorrow.format('YYYY-MM-DD')}`);

    const meetings = await calendarService.listMeetings(
      today.toISOString(),
      tomorrow.toISOString()
    );

    console.log('✅ API 連線成功\n');

    // 步驟 3: 顯示會議列表
    console.log('步驟 3/3: 取得會議列表...');
    console.log(`✅ 找到 ${meetings.length} 個會議\n`);

    if (meetings.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 今日會議列表:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      meetings.forEach((event, index) => {
        const startTime = dayjs(event.start.dateTime || event.start.date);
        const endTime = dayjs(event.end.dateTime || event.end.date);

        console.log(`${index + 1}. ${event.summary || '未命名會議'}`);
        console.log(`   時間: ${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`);
        console.log(`   地點: ${event.location || '未指定'}`);

        // 顯示 Discord 資訊
        const discordInfo = calendarService.getDiscordInfo(event);
        if (discordInfo && discordInfo.participants) {
          console.log(`   參加者: ${discordInfo.participants.length} 人`);
        }

        console.log('');
      });
    } else {
      console.log('ℹ️  今日沒有會議');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 所有測試通過！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Google Calendar API 設定正確，可以開始使用機器人了！\n');

    process.exit(0);
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ 測試失敗');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.error('錯誤訊息:', error.message);
    console.error('');

    // 根據錯誤類型提供建議
    if (error.message.includes('Service Account')) {
      console.error('💡 可能的解決方案:');
      console.error('   1. 確認 service-account.json 檔案存在');
      console.error('   2. 確認 GOOGLE_SERVICE_ACCOUNT_PATH 路徑正確');
      console.error('   3. 確認 JSON 檔案格式正確');
      console.error('   4. 確認 Service Account 有存取日曆的權限\n');
      console.error('📖 詳細說明: docs/SERVICE_ACCOUNT_SETUP.md\n');
    } else if (error.message.includes('OAuth')) {
      console.error('💡 可能的解決方案:');
      console.error('   1. 確認 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET 正確');
      console.error('   2. 執行 npm run get-token 重新取得 refresh token');
      console.error('   3. 確認 .env 檔案中的 token 正確無誤\n');
      console.error('📖 詳細說明: scripts/README.md\n');
    } else if (error.message.includes('invalid_grant') || error.message.includes('expired')) {
      console.error('💡 Token 已過期或無效:');
      console.error('   執行以下指令重新取得 token:');
      console.error('   npm run get-token\n');
    } else if (error.message.includes('Calendar usage limit exceeded')) {
      console.error('💡 API 配額已用盡:');
      console.error('   請稍後再試，或增加 Google Cloud 專案的配額\n');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('💡 日曆 ID 無效:');
      console.error('   1. 確認 GOOGLE_CALENDAR_ID 正確');
      console.error('   2. 如使用 Service Account，確認已共用日曆\n');
    } else {
      console.error('💡 一般故障排除:');
      console.error('   1. 檢查網路連線');
      console.error('   2. 確認 Google Calendar API 已啟用');
      console.error('   3. 檢查 .env 檔案配置是否完整');
      console.error('   4. 查看完整錯誤訊息尋找線索\n');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(1);
  }
}

// 執行測試
testCalendarConnection();
