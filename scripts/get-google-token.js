#!/usr/bin/env node

/**
 * Google OAuth Token 取得工具
 *
 * 使用方法:
 * 1. 確保 .env 檔案中已設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET
 * 2. 執行: node scripts/get-google-token.js
 * 3. 在瀏覽器中完成授權
 * 4. 複製新的 REFRESH_TOKEN 到 .env 檔案
 */

import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 取得專案根目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 載入環境變數
dotenv.config({ path: resolve(rootDir, '.env') });

// OAuth 設定
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// 建立 OAuth2 客戶端
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// 產生授權 URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 取得 refresh token
  scope: SCOPES,
  prompt: 'consent', // 強制顯示同意畫面以取得新的 refresh token
});

console.log('🚀 Google OAuth 授權流程');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('步驟 1: 啟動本地伺服器...');

// 建立臨時 HTTP 伺服器來接收授權回調
const server = http.createServer(async (req, res) => {
  try {
    const queryParams = url.parse(req.url, true).query;

    if (req.url.indexOf('/oauth2callback') > -1) {
      const code = queryParams.code;

      if (!code) {
        res.end('❌ 授權失敗: 未取得授權碼');
        return;
      }

      console.log('\n✅ 步驟 3: 收到授權碼,正在交換 tokens...');

      // 使用授權碼交換 tokens
      const { tokens } = await oauth2Client.getToken(code);

      // 顯示成功訊息
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>授權成功</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #4caf50; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; }
              .token-box {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 12px;
              }
              .notice {
                background: #fff3cd;
                color: #856404;
                padding: 10px;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ 授權成功!</h1>
              <p>已成功取得 Google Calendar API 存取權限。</p>
              <p><strong>請回到終端機查看您的 Refresh Token</strong></p>
              <div class="notice">
                ⚠️ 注意: Token 已顯示在終端機中,請勿關閉此視窗直到複製完成
              </div>
              <p style="margin-top: 20px; color: #999; font-size: 14px;">
                您現在可以關閉此視窗
              </p>
            </div>
          </body>
        </html>
      `);

      // 在終端機顯示 tokens
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 授權成功!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      if (tokens.refresh_token) {
        console.log('📋 您的新 REFRESH TOKEN:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(tokens.refresh_token);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📝 請執行以下步驟:');
        console.log('   1. 複製上方的 refresh token');
        console.log('   2. 打開 .env 檔案');
        console.log('   3. 更新 GOOGLE_REFRESH_TOKEN=<你的新token>');
        console.log('   4. 儲存檔案並重新啟動機器人\n');
      } else {
        console.log('⚠️  警告: 未取得新的 refresh_token');
        console.log('    可能的原因:');
        console.log('    1. 您之前已經授權過此應用程式');
        console.log('    2. 請到 Google 帳戶設定撤銷應用程式權限後重試');
        console.log('    3. 或使用不同的 Google 帳號\n');
      }

      console.log('🔧 Access Token (僅供測試用):');
      console.log(tokens.access_token?.substring(0, 50) + '...\n');

      // 關閉伺服器
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    res.end('❌ 發生錯誤: ' + error.message);
    server.close();
    process.exit(1);
  }
});

// 啟動伺服器
server.listen(3000, () => {
  console.log('✅ 本地伺服器已啟動於 http://localhost:3000\n');
  console.log('步驟 2: 正在開啟瀏覽器進行授權...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 在瀏覽器中開啟授權 URL
  open(authUrl).then(() => {
    console.log('📱 如果瀏覽器未自動開啟,請手動訪問以下網址:');
    console.log(authUrl);
    console.log('');
  }).catch(() => {
    console.log('📱 請在瀏覽器中訪問以下網址完成授權:');
    console.log(authUrl);
    console.log('');
  });
});

// 處理錯誤
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('❌ 錯誤: 埠口 3000 已被佔用');
    console.error('   請關閉佔用 3000 埠的應用程式後重試');
  } else {
    console.error('❌ 伺服器錯誤:', error.message);
  }
  process.exit(1);
});
