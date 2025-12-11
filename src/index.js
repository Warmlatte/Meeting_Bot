import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import config from "./config/env.js";

// 建立 Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// 初始化指令集合
client.commands = new Collection();

// 載入指令
import addMeeting from "./commands/add-meeting.js";

// 註冊指令到 client 和註冊陣列
client.commands.set(addMeeting.data.name, addMeeting);

// 建立指令註冊陣列
const commands = [];
commands.push(addMeeting.data.toJSON());

// 載入事件處理器
import ready from "./events/ready.js";
import interactionCreate from "./events/interactionCreate.js";

// 註冊事件
client.once(Events.ClientReady, ready.execute);
client.on(Events.InteractionCreate, interactionCreate.execute);

// 設置 Discord REST API
const rest = new REST({ version: "10" }).setToken(config.discord.token);

// Bot 啟動時顯示成功訊息並註冊指令
client.once(Events.ClientReady, async (readyClient) => {
  try {
    console.log(`✅ Bot 已啟動,登入為:${readyClient.user.tag}`);

    console.log(`開始註冊 ${commands.length} 個斜線指令...`);

    // 註冊全域指令
    const data = await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });

    console.log(`成功註冊 ${data.length} 個斜線指令!`);
  } catch (error) {
    console.error(`註冊指令時發生錯誤: ${error}`);
  }
});

// 錯誤處理
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

// 登入 Discord
client.login(config.discord.token);
