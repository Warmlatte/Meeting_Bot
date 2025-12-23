#!/usr/bin/env node

/**
 * Service Account JSON 驗證工具
 *
 * 檢查 service-account.json 檔案是否為正確的 Service Account 金鑰
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Service Account JSON 驗證工具');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const filePath = resolve(rootDir, 'service-account.json');

// 檢查檔案是否存在
if (!existsSync(filePath)) {
  console.error('❌ 錯誤: service-account.json 檔案不存在\n');
  console.log('📝 請先建立 Service Account 並下載 JSON 金鑰');
  console.log('📖 詳細步驟: docs/FIX_SERVICE_ACCOUNT.md\n');
  process.exit(1);
}

console.log('✅ 檔案存在: service-account.json\n');

// 讀取並解析 JSON
let data;
try {
  const content = readFileSync(filePath, 'utf-8');
  data = JSON.parse(content);
  console.log('✅ JSON 格式正確\n');
} catch (error) {
  console.error('❌ 錯誤: JSON 格式不正確');
  console.error('   詳細錯誤:', error.message);
  console.log('\n💡 請確認檔案是有效的 JSON 格式\n');
  process.exit(1);
}

// 檢查檔案類型
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 檔案類型檢查');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const isServiceAccount = data.type === 'service_account';
const isOAuthClient = data.web || data.installed;

if (isOAuthClient) {
  console.error('❌ 這是 OAuth 2.0 客戶端憑證，不是 Service Account 金鑰！\n');
  console.log('📖 您需要重新下載正確的檔案');
  console.log('   詳細步驟: docs/FIX_SERVICE_ACCOUNT.md\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

if (!isServiceAccount) {
  console.error('❌ 無法識別的檔案類型\n');
  console.log('   缺少 type: "service_account" 欄位\n');
  process.exit(1);
}

console.log('✅ 檔案類型: Service Account\n');

// 檢查必要欄位
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 必要欄位檢查');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const requiredFields = {
  'type': 'Service Account 類型',
  'project_id': '專案 ID',
  'private_key_id': '私鑰 ID',
  'private_key': '私鑰',
  'client_email': '客戶端 Email',
  'client_id': '客戶端 ID',
};

let allFieldsPresent = true;

for (const [field, description] of Object.entries(requiredFields)) {
  const isPresent = field in data && data[field];
  const status = isPresent ? '✅' : '❌';
  console.log(`${status} ${description.padEnd(20)} (${field})`);

  if (!isPresent) {
    allFieldsPresent = false;
  }
}

console.log('');

if (!allFieldsPresent) {
  console.error('❌ 缺少必要欄位，請重新下載 Service Account 金鑰\n');
  console.log('📖 詳細步驟: docs/FIX_SERVICE_ACCOUNT.md\n');
  process.exit(1);
}

// 顯示 Service Account 資訊
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Service Account 資訊');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('專案 ID:', data.project_id);
console.log('客戶端 Email:', data.client_email);
console.log('客戶端 ID:', data.client_id);
console.log('私鑰 ID:', data.private_key_id.substring(0, 20) + '...');

// 檢查私鑰格式
const privateKeyValid = data.private_key.includes('BEGIN PRIVATE KEY') &&
                        data.private_key.includes('END PRIVATE KEY');

if (privateKeyValid) {
  console.log('私鑰格式: ✅ 正確\n');
} else {
  console.log('私鑰格式: ❌ 可能不正確\n');
}

// 下一步指示
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 下一步');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1. 複製以下 Email:');
console.log(`   ${data.client_email}\n`);

console.log('2. 前往 Google Calendar:');
console.log('   https://calendar.google.com/\n');

console.log('3. 共用日曆給 Service Account:');
console.log('   - 選擇日曆 → 設定與共用');
console.log('   - 與特定人士共用 → 新增使用者');
console.log('   - 貼上上面的 Email');
console.log('   - 權限: 進行變更和管理共用設定\n');

console.log('4. 更新 .env 檔案:');
console.log('   GOOGLE_AUTH_TYPE=service_account');
console.log('   GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json');
console.log('   GOOGLE_CALENDAR_ID=你的日曆ID\n');

console.log('5. 測試連線:');
console.log('   npm run test-calendar\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Service Account JSON 檔案驗證通過！');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(0);
