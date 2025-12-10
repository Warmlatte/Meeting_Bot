import { google } from "googleapis";
import http from "http";
import { parse } from "url";
import { promisify } from "util";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// 從環境變數取得
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "請填入你的Client ID";
const CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "請填入你的Client Secret";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

console.log("\n========================================");
console.log("📋 Google Calendar API - 取得 Refresh Token");
console.log("========================================\n");

// 檢查環境變數
if (CLIENT_ID.includes("請填入")) {
  console.log("❌ 錯誤: 請先在 .env 檔案中設定 GOOGLE_CLIENT_ID");
  console.log("   從 Google Cloud Console 取得 OAuth 2.0 憑證\n");
  process.exit(1);
}

if (CLIENT_SECRET.includes("請填入")) {
  console.log("❌ 錯誤: 請先在 .env 檔案中設定 GOOGLE_CLIENT_SECRET");
  console.log("   從 Google Cloud Console 取得 OAuth 2.0 憑證\n");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// 產生授權 URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // 強制顯示同意畫面以取得 refresh token
});

console.log("📝 重要提示:");
console.log("   1. 請確認 Google Cloud Console 的 OAuth 用戶端 ID 設定中");
console.log(
  "   2. 已授權的重新導向 URI 包含: http://localhost:3000/oauth2callback"
);
console.log("");
console.log("如何新增重新導向 URI:");
console.log("   1. 前往 https://console.cloud.google.com/apis/credentials");
console.log("   2. 點擊你的 OAuth 2.0 用戶端 ID");
console.log("   3. 在「已授權的重新導向 URI」區塊點擊「+ 新增 URI」");
console.log("   4. 輸入: http://localhost:3000/oauth2callback");
console.log("   5. 點擊「儲存」");
console.log("");
console.log("========================================\n");

// 建立本地伺服器接收授權碼
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);

    if (parsedUrl.pathname === "/oauth2callback") {
      const code = parsedUrl.query.code;

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>❌ 授權失敗</h1><p>未收到授權碼</p>");
        return;
      }

      // 取得 tokens
      const { tokens } = await oauth2Client.getToken(code);

      // 顯示成功頁面
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html>
          <head>
            <title>授權成功</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              h1 { color: #0f9d58; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
              .token { background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>✅ 授權成功!</h1>
            <p>Refresh Token 已取得,請將以下內容加入 <code>.env</code> 檔案:</p>
            <div class="token">
              <code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</code>
            </div>
            <p>您現在可以關閉此視窗,並返回終端機查看完整資訊。</p>
          </body>
        </html>
      `);

      // 在終端機顯示結果
      console.log("\n========================================");
      console.log("✅ 成功取得 Refresh Token!");
      console.log("========================================\n");

      console.log("請將以下資訊加入 .env 檔案:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("");

      if (tokens.access_token) {
        console.log("Access Token (用於測試,會過期):");
        console.log(tokens.access_token.substring(0, 50) + "...");
        console.log("");
      }

      console.log("========================================\n");
      console.log("✅ 設定完成後,執行以下指令測試:");
      console.log("   node diagnose-google-auth.js\n");

      // 關閉伺服器
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error("\n❌ 錯誤:", error.message);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>❌ 發生錯誤</h1><p>" + error.message + "</p>");
    setTimeout(() => {
      server.close();
      process.exit(1);
    }, 1000);
  }
});

// 啟動伺服器
server.listen(3000, () => {
  console.log("🚀 本地授權伺服器已啟動在 http://localhost:3000");
  console.log("");
  console.log("步驟 1: 請在瀏覽器中開啟以下 URL:\n");
  console.log(authUrl);
  console.log("");
  console.log("步驟 2: 完成授權後,瀏覽器會自動重新導向");
  console.log("        Refresh Token 將自動顯示在此處");
  console.log("");
  console.log("⏳ 等待授權中...\n");
});
