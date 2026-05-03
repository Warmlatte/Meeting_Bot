import { jest } from '@jest/globals';

const mockCalendarEvents = {
  insert: jest.fn(),
  list: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.unstable_mockModule('googleapis', () => ({
  google: {
    calendar: jest.fn().mockReturnValue({ events: mockCalendarEvents }),
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
      OAuth2: jest.fn().mockImplementation(() => ({ setCredentials: jest.fn() })),
    },
  },
}));

jest.unstable_mockModule('../../src/config/env.js', () => ({
  default: {
    timezone: 'Asia/Taipei',
    discord: { token: 'test', clientId: 'test', guildId: 'test' },
    google: {
      calendarId: 'test@group.calendar.google.com',
      authType: 'oauth',
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      refreshToken: 'test-refresh-token',
    },
    nodeEnv: 'test',
  },
}));

jest.unstable_mockModule('../../src/config/constants.js', () => ({
  default: {
    RENTAL_TYPE: '租借',
    RENTAL_LOCATION: 'TRB工作室',
    RENTAL_COLOR_ID: '3',
    DEFAULTS: { MEETING_DURATION: 2, RENTAL_DURATION: 2, ONLINE_LOCATION: 'DC' },
    VENUE_KEYWORDS: ['TRB', '工作室'],
  },
}));

const { default: CalendarService } = await import('../../src/services/calendar.js');

let service;
beforeEach(() => {
  service = new CalendarService();
});

const meetingData = {
  title: '劇本架構會議',
  type: '線下會議',
  content: '1. 議程一\n2. 議程二',
  location: 'TRB工作室',
  guild_id: '123',
  channel_id: '456',
  creator_id: '789',
  participants: [
    { name: '玩骰子的貓', user_id: '111' },
    { name: '三千(無DC)', user_id: null },
  ],
};

// ─── formatDescription() ───────────────────────────────────────────────────

describe('CalendarService.formatDescription()', () => {
  test('輸出包含「=== 會議內容 ===」區塊', () => {
    expect(service.formatDescription(meetingData)).toContain('=== 會議內容 ===');
  });

  test('輸出包含「=== 參加者 ===」區塊', () => {
    expect(service.formatDescription(meetingData)).toContain('=== 參加者 ===');
  });

  test('輸出包含「=== Discord 資訊 (JSON) ===」區塊', () => {
    expect(service.formatDescription(meetingData)).toContain('=== Discord 資訊 (JSON) ===');
  });

  test('Discord JSON 區塊可正確解析', () => {
    const result = service.formatDescription(meetingData);
    const jsonMatch = result.match(/=== Discord 資訊 \(JSON\) ===\n({[\s\S]*})/);
    expect(jsonMatch).not.toBeNull();
    expect(() => JSON.parse(jsonMatch[1])).not.toThrow();
  });

  test('(無DC) 參加者保留名稱', () => {
    expect(service.formatDescription(meetingData)).toContain('三千(無DC)');
  });

  test('有 user_id 的參加者也包含在參加者區塊', () => {
    expect(service.formatDescription(meetingData)).toContain('@玩骰子的貓');
  });
});

// ─── parseDescription() ────────────────────────────────────────────────────

describe('CalendarService.parseDescription()', () => {
  test('空字串回傳預設結構', () => {
    expect(service.parseDescription('')).toEqual({ content: '', participants: '', discordInfo: null });
  });

  test('null 或 undefined 回傳預設結構', () => {
    expect(service.parseDescription(null)).toEqual({ content: '', participants: '', discordInfo: null });
    expect(service.parseDescription(undefined)).toEqual({ content: '', participants: '', discordInfo: null });
  });

  test('正常解析三個區塊', () => {
    const description = service.formatDescription(meetingData);
    const parsed = service.parseDescription(description);
    expect(parsed.content).toContain('1. 議程一');
    expect(parsed.discordInfo).not.toBeNull();
    expect(parsed.discordInfo.guild_id).toBe('123');
  });

  test('JSON 解析失敗時 discordInfo 回傳 null', () => {
    const brokenJson = `=== 會議內容 ===
內容

=== 參加者 ===
無

=== Discord 資訊 (JSON) ===
{ invalid json }`;
    expect(service.parseDescription(brokenJson).discordInfo).toBeNull();
  });
});

// ─── hasConflict() ─────────────────────────────────────────────────────────

describe('CalendarService.hasConflict()', () => {
  test('完全重疊回傳 true', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '13:00', '15:00')).toBe(true);
  });

  test('部分重疊（後段）回傳 true', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '14:00', '16:00')).toBe(true);
  });

  test('部分重疊（前段）回傳 true', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '12:00', '14:00')).toBe(true);
  });

  test('完全包含回傳 true', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '13:30', '14:30')).toBe(true);
  });

  test('不重疊（之後）回傳 false', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '16:00', '18:00')).toBe(false);
  });

  test('不重疊（之前）回傳 false', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '10:00', '12:00')).toBe(false);
  });

  test('邊界相接（結束=開始）回傳 false', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '15:00', '17:00')).toBe(false);
  });

  test('邊界相接（結束=結束開始之前）回傳 false', () => {
    expect(CalendarService.hasConflict('13:00', '15:00', '11:00', '13:00')).toBe(false);
  });
});
