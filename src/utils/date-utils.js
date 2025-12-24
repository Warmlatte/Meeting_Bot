import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import config from '../config/env.js';

// 載入所有需要的 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

// 設定預設時區
const DEFAULT_TIMEZONE = config.timezone || 'Asia/Taipei';

/**
 * 取得當前時間（已設定時區）
 * @returns {dayjs.Dayjs} dayjs 物件
 */
export function now() {
  return dayjs().tz(DEFAULT_TIMEZONE);
}

/**
 * 解析日期字串（已設定時區）
 * @param {string} dateString - 日期字串
 * @param {string} format - 日期格式 (可選)
 * @returns {dayjs.Dayjs} dayjs 物件
 */
export function parseDate(dateString, format = undefined) {
  if (format) {
    return dayjs.tz(dateString, format, DEFAULT_TIMEZONE);
  }
  return dayjs.tz(dateString, DEFAULT_TIMEZONE);
}

/**
 * 建立指定時區的 dayjs 實例
 * @param {string|Date|dayjs.Dayjs} date - 日期
 * @returns {dayjs.Dayjs} dayjs 物件
 */
export function createDate(date = undefined) {
  if (date === undefined) {
    return now();
  }
  return dayjs(date).tz(DEFAULT_TIMEZONE);
}

/**
 * 取得今日開始時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getTodayStart() {
  return now().startOf('day').toISOString();
}

/**
 * 取得今日結束時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getTodayEnd() {
  return now().endOf('day').toISOString();
}

/**
 * 取得本週開始時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getThisWeekStart() {
  return now().startOf('isoWeek').toISOString();
}

/**
 * 取得本週結束時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getThisWeekEnd() {
  return now().endOf('isoWeek').toISOString();
}

/**
 * 取得本月開始時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getThisMonthStart() {
  return now().startOf('month').toISOString();
}

/**
 * 取得本月結束時間（已設定時區）
 * @returns {string} ISO 格式時間
 */
export function getThisMonthEnd() {
  return now().endOf('month').toISOString();
}

/**
 * 格式化日期時間
 * @param {string|Date|dayjs.Dayjs} date - 日期
 * @param {string} format - 格式 (預設: 'YYYY-MM-DD HH:mm')
 * @returns {string} 格式化後的日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
  return createDate(date).format(format);
}

/**
 * 取得預設時區
 * @returns {string} 時區名稱
 */
export function getTimezone() {
  return DEFAULT_TIMEZONE;
}

// 預設匯出設定好時區的 dayjs
export default dayjs;
