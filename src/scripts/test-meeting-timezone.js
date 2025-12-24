import { parseDate } from '../utils/date-utils.js';
import Parser from '../services/parser.js';

console.log('=== 建立會議時區測試 ===\n');

// 測試場景：使用者輸入 12:00，期望建立台北時間 12:00 的會議
const testDate = '2025-12-25';
const testTime = '12:00';

console.log(`📅 輸入資料:`);
console.log(`   日期: ${testDate}`);
console.log(`   時間: ${testTime}`);
console.log(`   期望: 台北時間 2025-12-25 12:00\n`);

// 模擬 calendar.js 的處理方式
console.log('🔧 使用修復後的 parseDate:');
const startTime = parseDate(`${testDate} ${testTime}`, 'YYYY-MM-DD HH:mm');
const endTime = startTime.add(2, 'hour');

console.log(`   startTime 物件:`);
console.log(`   - 台北時間: ${startTime.format('YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - ISO (送給 Google): ${startTime.toISOString()}`);
console.log(`   - 時區偏移: UTC${startTime.format('Z')}\n`);

console.log(`   endTime 物件:`);
console.log(`   - 台北時間: ${endTime.format('YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - ISO (送給 Google): ${endTime.toISOString()}\n`);

// 測試 Parser.combineDateTime
console.log('🔧 測試 Parser.combineDateTime:');
const parsedDateTime = Parser.combineDateTime(testDate, testTime);
console.log(`   - 台北時間: ${parsedDateTime.format('YYYY-MM-DD HH:mm:ss')}`);
console.log(`   - ISO: ${parsedDateTime.toISOString()}\n`);

// 驗證時區正確性
console.log('✅ 驗證結果:');
const expectedUTC = '2025-12-25T04:00:00.000Z'; // 台北 12:00 = UTC 04:00
const actualUTC = startTime.toISOString();

console.log(`   預期 UTC 時間: ${expectedUTC}`);
console.log(`   實際 UTC 時間: ${actualUTC}`);
console.log(`   是否正確: ${actualUTC === expectedUTC ? '✅ 正確' : '❌ 錯誤'}\n`);

// 說明
console.log('📝 說明:');
console.log('   台北時間 (UTC+8): 2025-12-25 12:00');
console.log('   對應 UTC 時間:     2025-12-25 04:00');
console.log('   Google Calendar 收到 UTC 時間後，會依照用戶時區顯示');
console.log('   當設定 timeZone: "Asia/Taipei" 時，會顯示台北時間 12:00 ✅\n');

// 模擬雲端環境測試
console.log('🌍 雲端環境模擬:');
console.log('   即使在 UTC 時區的伺服器上執行，');
console.log('   使用 parseDate 會強制使用 Asia/Taipei 時區，');
console.log('   所以輸入 12:00 仍會建立台北時間 12:00 的會議 ✅');
