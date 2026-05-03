import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/config/env.js', () => ({
  default: {
    timezone: 'Asia/Taipei',
    discord: { token: 'test', clientId: 'test', guildId: 'test' },
    google: { calendarId: 'test@group.calendar.google.com', authType: 'oauth' },
    nodeEnv: 'test',
  },
}));

const { default: Parser } = await import('../../src/services/parser.js');

describe('Parser.parseDate()', () => {
  test('解析 YY/M/D 格式 (25/10/7)', () => {
    expect(Parser.parseDate('25/10/7')).toBe('2025-10-07');
  });

  test('解析 YY/MM/DD 格式 (25/10/07)', () => {
    expect(Parser.parseDate('25/10/07')).toBe('2025-10-07');
  });

  test('解析 YYYY.MM.DD 格式 (2025.10.07)', () => {
    expect(Parser.parseDate('2025.10.07')).toBe('2025-10-07');
  });

  test('解析 YYYY-MM-DD 格式 (2025-10-07)', () => {
    expect(Parser.parseDate('2025-10-07')).toBe('2025-10-07');
  });

  test('解析 YYYYMMDD 格式 (20251007)', () => {
    expect(Parser.parseDate('20251007')).toBe('2025-10-07');
  });

  test('解析 YYMMDD 格式 (251007)', () => {
    expect(Parser.parseDate('251007')).toBe('2025-10-07');
  });

  test('空字串回傳原值', () => {
    expect(Parser.parseDate('')).toBe('');
  });

  test('無效格式回傳原字串', () => {
    expect(Parser.parseDate('invalid-date')).toBe('invalid-date');
  });
});

describe('Parser.parseTime()', () => {
  test('解析英文冒號格式 (13:00)', () => {
    expect(Parser.parseTime('13:00')).toBe('13:00');
  });

  test('解析中文冒號格式 (13：00)', () => {
    expect(Parser.parseTime('13：00')).toBe('13:00');
  });

  test('解析 HHMM 格式 (1300)', () => {
    expect(Parser.parseTime('1300')).toBe('13:00');
  });

  test('解析個位數小時 HMM 格式 (930)', () => {
    expect(Parser.parseTime('930')).toBe('09:30');
  });

  test('解析單位數小時加冒號 (9:00)', () => {
    expect(Parser.parseTime('9:00')).toBe('09:00');
  });
});

describe('Parser.parseDateTimeInput()', () => {
  test('解析 YYYYMMDD HHMM 格式', () => {
    const result = Parser.parseDateTimeInput('20251215 1400');
    expect(result).toEqual({ date: '2025-12-15', time: '14:00' });
  });

  test('解析 YYMMDD HHMM 格式', () => {
    const result = Parser.parseDateTimeInput('251215 1400');
    expect(result).toEqual({ date: '2025-12-15', time: '14:00' });
  });

  test('解析 10位緊湊格式 YYMMDDHHMM (2512151400)', () => {
    const result = Parser.parseDateTimeInput('2512151400');
    expect(result).toEqual({ date: '2025-12-15', time: '14:00' });
  });

  test('無法解析時回傳 null', () => {
    expect(Parser.parseDateTimeInput('invalid')).toBeNull();
  });
});
