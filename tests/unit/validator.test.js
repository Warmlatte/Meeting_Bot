import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/config/env.js', () => ({
  default: {
    timezone: 'Asia/Taipei',
    discord: { token: 'test', clientId: 'test', guildId: 'test' },
    google: { calendarId: 'test@group.calendar.google.com', authType: 'oauth' },
    nodeEnv: 'test',
  },
}));

const { default: Validator } = await import('../../src/utils/validator.js');

const validMeeting = {
  title: '測試會議',
  date: '2099-12-31',
  time: '14:00',
  type: '線上會議',
  location: 'DC',
};

describe('Validator.validateMeeting()', () => {
  test('全部欄位合法時回傳空陣列', () => {
    expect(Validator.validateMeeting(validMeeting)).toEqual([]);
  });

  test('缺少 title 回傳含「會議名稱為必填」', () => {
    const { title, ...data } = validMeeting;
    expect(Validator.validateMeeting(data)).toContain('會議名稱為必填');
  });

  test('title 為空字串回傳含「會議名稱為必填」', () => {
    expect(Validator.validateMeeting({ ...validMeeting, title: '' })).toContain('會議名稱為必填');
  });

  test('缺少 date 回傳含「會議日期為必填」', () => {
    const { date, ...data } = validMeeting;
    expect(Validator.validateMeeting(data)).toContain('會議日期為必填');
  });

  test('缺少 time 回傳含「會議時間為必填」', () => {
    const { time, ...data } = validMeeting;
    expect(Validator.validateMeeting(data)).toContain('會議時間為必填');
  });

  test('缺少 type 回傳含「會議類型為必填」', () => {
    const { type, ...data } = validMeeting;
    expect(Validator.validateMeeting(data)).toContain('會議類型為必填');
  });

  test('缺少 location 回傳含「會議地點為必填」', () => {
    const { location, ...data } = validMeeting;
    expect(Validator.validateMeeting(data)).toContain('會議地點為必填');
  });

  test('過去日期回傳含「會議日期不可為過去」', () => {
    expect(Validator.validateMeeting({ ...validMeeting, date: '2020-01-01' })).toContain('會議日期不可為過去');
  });

  test('無效日期格式回傳含「日期格式錯誤」', () => {
    expect(Validator.validateMeeting({ ...validMeeting, date: 'not-a-date' })).toContain('日期格式錯誤');
  });

  test('無效時間格式回傳含「時間格式錯誤」', () => {
    expect(Validator.validateMeeting({ ...validMeeting, time: '9:0' })).toContain('時間格式錯誤 (應為 HHMM，例如 1400)');
  });

  test('title 超過 100 字元回傳含長度錯誤訊息', () => {
    const longTitle = 'a'.repeat(101);
    expect(Validator.validateMeeting({ ...validMeeting, title: longTitle })).toContain('會議名稱不可超過 100 字元');
  });
});

describe('Validator.validateParticipants()', () => {
  test('空陣列回傳含「至少需要一位參加者」', () => {
    expect(Validator.validateParticipants([])).toContain('至少需要一位參加者');
  });

  test('null 回傳含「至少需要一位參加者」且長度為 1', () => {
    const errors = Validator.validateParticipants(null);
    expect(errors).toContain('至少需要一位參加者');
    expect(errors).toHaveLength(1);
  });

  test('合法參加者陣列回傳空陣列', () => {
    expect(Validator.validateParticipants([{ name: 'A', user_id: '1' }])).toEqual([]);
  });

  test('超過 20 位參加者回傳含限制錯誤', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => ({ name: `User${i}`, user_id: `${i}` }));
    expect(Validator.validateParticipants(tooMany)).toContain('參加者不可超過 20 位');
  });
});
