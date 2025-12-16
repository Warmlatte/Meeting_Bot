import CalendarService from '../services/calendar.js';
import dayjs from 'dayjs';

/**
 * 測試提醒功能的診斷腳本
 */
async function testReminders() {
  console.log('=== 提醒功能診斷 ===\n');

  const calendarService = new CalendarService();

  try {
    // 1. 檢查未來 3 小時內的會議
    const now = dayjs();
    const timeMin = now.toISOString();
    const timeMax = now.add(3, 'hour').toISOString();

    console.log(`⏰ 當前時間: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`🔍 查詢範圍: ${now.format('HH:mm')} - ${now.add(3, 'hour').format('HH:mm')}\n`);

    const events = await calendarService.listMeetings(timeMin, timeMax);

    if (events.length === 0) {
      console.log('❌ 沒有找到未來 3 小時內的會議');
      console.log('請確認已建立會議且時間在 2 小時後\n');
      return;
    }

    console.log(`✅ 找到 ${events.length} 個會議:\n`);

    // 2. 分析每個會議
    for (const event of events) {
      const meeting = calendarService.parseMeetingEvent(event);
      const startTime = dayjs(meeting.startTime);
      const minutesUntilStart = startTime.diff(now, 'minute');

      console.log(`📅 會議: ${meeting.title}`);
      console.log(`   ID: ${meeting.id}`);
      console.log(`   開始時間: ${startTime.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`   距離開始: ${minutesUntilStart} 分鐘`);
      console.log(`   參加者數量: ${meeting.participants.length}`);

      if (meeting.participants.length > 0) {
        console.log(`   參加者:`);
        meeting.participants.forEach(p => {
          console.log(`     - ${p.name} (ID: ${p.user_id})`);
        });
      } else {
        console.log(`   ⚠️  沒有參加者資料`);
      }

      // 檢查是否符合提醒條件
      if (minutesUntilStart >= 100 && minutesUntilStart <= 140) {
        console.log(`   ✅ 符合 2 小時提醒條件 (100-140 分鐘)`);
      } else {
        console.log(`   ❌ 不符合提醒條件 (需要 100-140 分鐘之間)`);
        if (minutesUntilStart < 100) {
          console.log(`      → 太接近會議時間了 (少於 100 分鐘)`);
        } else if (minutesUntilStart > 140) {
          console.log(`      → 距離會議還太遠 (超過 140 分鐘)`);
        }
      }

      console.log('');
    }

    // 3. 顯示建議
    console.log('=== 建議 ===');
    console.log('1. 如果沒有參加者資料，請檢查 Google Calendar 的 extendedProperties');
    console.log('2. 如果時間不符合條件，請使用 /test-reminder 指令手動觸發測試');
    console.log('3. 確認 Bot 有發送 DM 的權限');
    console.log('4. 確認參加者沒有關閉 DM 接收');

  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error);
  }
}

testReminders();
