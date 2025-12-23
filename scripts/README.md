# Google OAuth Token 取得工具

## 問題說明

當您看到以下錯誤訊息時:

```
取得會議列表失敗: GaxiosError: invalid_grant
Token has been expired or revoked.
```

這表示您的 Google OAuth **refresh token 已過期或被撤銷**,需要重新授權。

---

## 修復步驟

### 步驟 1: 確認 Google Cloud Console 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案
3. 進入「API 和服務」→「憑證」
4. 確認您的 OAuth 2.0 客戶端 ID 已建立
5. 點擊編輯 OAuth 客戶端
6. 在「已授權的重新導向 URI」中,新增:
   ```
   http://localhost:3000/oauth2callback
   ```
7. 儲存變更

### 步驟 2: 執行授權工具

在專案根目錄執行:

```bash
npm run get-token
```

或直接執行:

```bash
node scripts/get-google-token.js
```

### 步驟 3: 完成授權流程

1. 工具會自動在瀏覽器開啟 Google 授權頁面
2. 選擇您的 Google 帳號
3. 允許應用程式存取 Google Calendar
4. 授權完成後,瀏覽器會顯示成功訊息
5. **回到終端機**,複製顯示的 `REFRESH_TOKEN`

### 步驟 4: 更新環境變數

1. 打開專案根目錄的 `.env` 檔案
2. 找到 `GOOGLE_REFRESH_TOKEN` 這一行
3. 替換為新的 token:
   ```env
   GOOGLE_REFRESH_TOKEN=你的新token
   ```
4. 儲存檔案

### 步驟 5: 重新啟動機器人

```bash
npm start
```

或開發模式:

```bash
npm run dev
```

---

## 常見問題排除

### Q1: 瀏覽器沒有自動開啟?

**解決方法**: 終端機會顯示授權 URL,請手動複製到瀏覽器開啟。

### Q2: 顯示「未取得新的 refresh_token」?

**原因**: 您之前已經授權過此應用程式,Google 不會重複發放 refresh token。

**解決方法**:
1. 前往 [Google 帳戶權限設定](https://myaccount.google.com/permissions)
2. 找到您的應用程式
3. 點擊「移除存取權」
4. 重新執行 `npm run get-token`

### Q3: 顯示「埠口 3000 已被佔用」?

**解決方法**:
1. 關閉佔用 3000 埠的應用程式
2. 或修改 `scripts/get-google-token.js` 中的埠口號碼

### Q4: 授權後仍然出現 invalid_grant?

**檢查清單**:
- [ ] 確認新的 token 已正確複製到 `.env`
- [ ] 確認 `.env` 檔案已儲存
- [ ] 確認已重新啟動機器人
- [ ] 確認 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 正確
- [ ] 確認 Google Cloud Console 中的 OAuth 重新導向 URI 設定正確

### Q5: 為什麼會過期?

**常見原因**:
- Token 長時間未使用 (超過 6 個月)
- Google 偵測到可疑活動
- 手動撤銷了應用程式權限
- OAuth 客戶端設定變更

---

## 技術說明

### 授權流程

```
1. 使用者執行工具
   ↓
2. 工具啟動本地伺服器 (localhost:3000)
   ↓
3. 在瀏覽器開啟 Google 授權頁面
   ↓
4. 使用者登入並授權
   ↓
5. Google 重新導向到 localhost:3000/oauth2callback
   ↓
6. 工具接收授權碼
   ↓
7. 工具使用授權碼交換 refresh token
   ↓
8. 終端機顯示 refresh token
```

### 所需權限

- `https://www.googleapis.com/auth/calendar` - Google Calendar 完整存取

### 安全注意事項

- **絕對不要** 將 refresh token 提交到版本控制系統
- **絕對不要** 在公開場合分享 refresh token
- Refresh token 具有長期存取權限,請妥善保管
- 定期檢查並撤銷不需要的應用程式權限

---

## 相關資源

- [Google OAuth 2.0 文檔](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API 文檔](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 最佳實踐](https://tools.ietf.org/html/rfc6749)

---

**如果問題仍未解決,請檢查:**
1. Google Cloud Console 專案設定
2. API 是否已啟用 (Google Calendar API)
3. OAuth 同意畫面是否已設定
4. 網路連線是否正常
