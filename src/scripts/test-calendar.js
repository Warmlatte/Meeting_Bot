import CalendarService from './src/services/calendar.js';
import dayjs from 'dayjs';

async function testCalendarService() {
  const calendarService = new CalendarService();

  console.log('🧪 開始測試 Calendar Service...\n');

  try {
    // 測試 1: 建立會議
    console.log('📝 測試 1: 建立會議');
    const testMeeting = {
      type: '線上會議',
      title: '測試會議',
      date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      time: '14:00',
      duration: 2,
      location: 'DC',
      content: '這是一個測試會議',
      guild_id: 'test_guild',
      channel_id: 'test_channel',
      creator_id: 'test_user',
      participants: [
        { name: '測試用戶1', user_id: '123' },
        { name: '測試用戶2', user_id: '456' },
      ],
    };

    const createdEvent = await calendarService.createMeeting(testMeeting);
    console.log(`✅ 會議建立成功,ID: ${createdEvent.id}\n`);

    // 測試 2: 查詢會議列表
    console.log('📋 測試 2: 查詢會議列表');
    const meetings = await calendarService.listMeetings(
      dayjs().startOf('day').toISOString(),
      dayjs().add(7, 'day').endOf('day').toISOString()
    );
    console.log(`✅ 找到 ${meetings.length} 個會議\n`);

    // 測試 3: 取得單一會議
    console.log('🔍 測試 3: 取得單一會議');
    const meeting = await calendarService.getMeeting(createdEvent.id);
    console.log(`✅ 會議標題: ${meeting.summary}\n`);

    // 測試 4: 解析 Description
    console.log('📖 測試 4: 解析 Description');
    const parsed = calendarService.parseDescription(meeting.description);
    console.log(`✅ 解析成功:`);
    console.log(`   - 內容: ${parsed.content}`);
    console.log(`   - 參加者: ${parsed.participants}`);
    console.log(`   - Discord 資訊: ${JSON.stringify(parsed.discordInfo, null, 2)}\n`);

    // 測試 5: 更新會議
    console.log('✏️  測試 5: 更新會議');
    await calendarService.updateMeeting(createdEvent.id, {
      title: '測試會議 (已更新)',
      type: '線下會議',
    });
    console.log(`✅ 會議更新成功\n`);

    // 測試 6: 刪除會議
    console.log('🗑️  測試 6: 刪除會議');
    await calendarService.deleteMeeting(createdEvent.id);
    console.log(`✅ 會議刪除成功\n`);

    console.log('🎉 所有測試通過!');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testCalendarService();
