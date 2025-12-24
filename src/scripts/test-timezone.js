import {
  now,
  createDate,
  getTodayStart,
  getTodayEnd,
  getThisWeekStart,
  getThisWeekEnd,
  getTimezone,
  formatDate
} from '../utils/date-utils.js';

console.log('=== 時區設定測試 ===\n');

// 顯示時區設定
console.log(`✅ 配置的時區: ${getTimezone()}\n`);

// 測試當前時間
console.log('📅 當前時間:');
console.log(`   - ISO 格式: ${now().toISOString()}`);
console.log(`   - 台北時間: ${formatDate(now(), 'YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - 時區偏移: UTC${now().format('Z')}\n`);

// 測試今日範圍
console.log('📆 今日會議查詢範圍:');
console.log(`   - 開始: ${getTodayStart()}`);
console.log(`   - 結束: ${getTodayEnd()}`);
console.log(`   - 台北時間開始: ${formatDate(getTodayStart(), 'YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - 台北時間結束: ${formatDate(getTodayEnd(), 'YYYY-MM-DD HH:mm:ss')}\n`);

// 測試本週範圍
console.log('📅 本週會議查詢範圍:');
console.log(`   - 開始: ${getThisWeekStart()}`);
console.log(`   - 結束: ${getThisWeekEnd()}`);
console.log(`   - 台北時間開始: ${formatDate(getThisWeekStart(), 'YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - 台北時間結束: ${formatDate(getThisWeekEnd(), 'YYYY-MM-DD HH:mm:ss')}\n`);

// 驗證時區一致性
console.log('🔍 時區一致性驗證:');

const todayStart = getTodayStart();
const expectedHour = now().startOf('day').hour(); // 應該是 0
const actualDate = createDate(todayStart);

console.log(`   - 今日開始小時數: ${actualDate.hour()} (預期: 0)`);
console.log(`   - 是否正確: ${actualDate.hour() === 0 ? '✅' : '❌'}\n`);

// 模擬本地與雲端的差異
console.log('🌍 本地 vs 雲端時區差異測試:');
console.log('   假設場景:');
console.log('   - 本地: macOS (Asia/Taipei, UTC+8)');
console.log('   - 雲端: Zeabur (UTC+0)');
console.log('   - 修復前: 查詢時間會相差 8 小時');
console.log('   - 修復後: 統一使用 Asia/Taipei，查詢時間一致 ✅\n');

console.log('✅ 時區測試完成！');
console.log('💡 如果在雲端運行此腳本，應該看到相同的台北時間輸出。');
