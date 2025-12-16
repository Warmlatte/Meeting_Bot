import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import config from "./config/env.js";
import Scheduler from "./jobs/scheduler.js";

// 建立 Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// 初始化指令集合
client.commands = new Collection();

// 載入指令
import addMeeting from "./commands/add-meeting.js";
import listMeetings from "./commands/list-meetings.js";
import testReminder from "./commands/test-reminder.js";
import updateBoard from "./commands/update-board.js";

// 註冊指令到 client 和註冊陣列
client.commands.set(addMeeting.data.name, addMeeting);
client.commands.set(listMeetings.data.name, listMeetings);
client.commands.set(testReminder.data.name, testReminder);
client.commands.set(updateBoard.data.name, updateBoard);

// 建立指令註冊陣列
const commands = [];
commands.push(addMeeting.data.toJSON());
commands.push(listMeetings.data.toJSON());
commands.push(testReminder.data.toJSON());
commands.push(updateBoard.data.toJSON());

// 載入事件處理器
import ready from "./events/ready.js";
import interactionCreate from "./events/interactionCreate.js";

// 註冊事件
client.once(Events.ClientReady, ready.execute);
client.on(Events.InteractionCreate, interactionCreate.execute);

// 設置 Discord REST API
const rest = new REST({ version: "10" }).setToken(config.discord.token);

// 啟動定時任務調度器
let scheduler;

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

    // 啟動調度器
    scheduler = new Scheduler(client);
    scheduler.start();

    // 將 scheduler 掛載到 client 供其他模組使用
    client.scheduler = scheduler;
  } catch (error) {
    console.error(`註冊指令時發生錯誤: ${error}`);
  }
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n[Main] 收到 SIGINT,正在關閉...');
  if (scheduler) {
    scheduler.stop();
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Main] 收到 SIGTERM,正在關閉...');
  if (scheduler) {
    scheduler.stop();
  }
  client.destroy();
  process.exit(0);
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
