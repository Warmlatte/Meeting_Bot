/**
 * 整合測試：Google Calendar API
 *
 * 使用 GOOGLE_TEST_CALENDAR_ID 獨立測試日曆，測試後自動清理。
 * 需要真實 Google API 憑證，不適合在 CI 單元測試中執行。
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// 確認整合測試必要環境變數
const TEST_CALENDAR_ID = process.env.GOOGLE_TEST_CALENDAR_ID;
if (!TEST_CALENDAR_ID) {
  throw new Error('GOOGLE_TEST_CALENDAR_ID 未設定，無法執行整合測試');
}

const { default: CalendarService } = await import('../../src/services/calendar.js');

let service;
let createdEventId;

const testMeeting = {
  title: '[整合測試] Calendar API 測試會議',
  type: '線上會議',
  date: '2099-12-31',
  time: '10:00',
  duration: 1,
  location: 'DC',
  content: '整合測試自動建立，請勿手動刪除',
  guild_id: 'test-guild',
  channel_id: 'test-channel',
  creator_id: 'test-creator',
  participants: [{ name: 'TestUser', user_id: 'test-user-001' }],
};

beforeAll(() => {
  // 指向測試日曆
  process.env.GOOGLE_CALENDAR_ID = TEST_CALENDAR_ID;
  service = new CalendarService();
});

afterAll(async () => {
  // 清理：若測試中途失敗仍確保事件被刪除
  if (createdEventId) {
    try {
      await service.deleteMeeting(createdEventId);
      console.log(`🧹 清理測試事件: ${createdEventId}`);
    } catch {
      console.warn(`⚠️ 清理失敗，請手動刪除事件: ${createdEventId}`);
    }
  }
});

describe('CalendarService 整合測試 (Google Calendar API)', () => {
  test('createMeeting() 回傳含非空 id 的物件', async () => {
    const event = await service.createMeeting(testMeeting);
    expect(event).toBeDefined();
    expect(event.id).toBeTruthy();
    createdEventId = event.id;
    console.log(`✅ 建立測試事件: ${createdEventId}`);
  }, 15000);

  test('listMeetings() 結果中存在剛建立的 eventId', async () => {
    expect(createdEventId).toBeTruthy();

    const timeMin = new Date('2099-12-31T00:00:00+08:00').toISOString();
    const timeMax = new Date('2099-12-31T23:59:59+08:00').toISOString();
    const events = await service.listMeetings(timeMin, timeMax);

    const ids = events.map(e => e.id);
    expect(ids).toContain(createdEventId);
  }, 15000);

  test('updateMeeting() 回傳物件 summary 符合更新後的值', async () => {
    expect(createdEventId).toBeTruthy();

    const updated = await service.updateMeeting(createdEventId, {
      title: '[整合測試] 已更新的會議名稱',
      type: '線上會議',
    });

    expect(updated.summary).toContain('已更新的會議名稱');
  }, 15000);

  test('deleteMeeting() 後 listMeetings() 結果中不存在該 eventId', async () => {
    expect(createdEventId).toBeTruthy();

    await service.deleteMeeting(createdEventId);

    const timeMin = new Date('2099-12-31T00:00:00+08:00').toISOString();
    const timeMax = new Date('2099-12-31T23:59:59+08:00').toISOString();
    const events = await service.listMeetings(timeMin, timeMax);

    const ids = events.map(e => e.id);
    expect(ids).not.toContain(createdEventId);

    // 標記已清理，避免 afterAll 重複刪除
    createdEventId = null;
  }, 15000);
});
