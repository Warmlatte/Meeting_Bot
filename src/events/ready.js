import { Events } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot 已就緒! 登入為 ${client.user.tag}`);
    console.log(`📊 伺服器數量: ${client.guilds.cache.size}`);
    console.log(`👥 用戶數量: ${client.users.cache.size}`);

    // 設定 Bot 狀態
    client.user.setPresence({
      activities: [{ name: "有bug請敲拿鐵鐵 ☕️", type: "WATCHING" }],
      status: "online",
    });
  },
};
