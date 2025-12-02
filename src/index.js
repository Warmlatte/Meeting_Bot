import { Client, Collection, GatewayIntentBits } from "discord.js";
import { readdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import config from "./config/env.js";

// 取得當前檔案的目錄路徑 (ES Modules 中需要手動處理 __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 建立 Discord Client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

/**
 * 初始化指令集合
 */
client.commands = new Collection();

/**
 * 載入指令
 */
async function loadCommands() {
  const commandsPath = join(__dirname, "commands");

  try {
    const commandFiles = (await readdir(commandsPath)).filter((file) =>
      file.endsWith(".js")
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      const commandModule = command.default;

      if ("data" in commandModule && "execute" in commandModule) {
        client.commands.set(commandModule.data.name, commandModule);
        console.log(`✅ 已載入指令: ${commandModule.data.name}`);
      } else {
        console.warn(`⚠️ 指令 ${file} 缺少必要的 "data" 或 "execute" 屬性`);
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("⚠️ commands 目錄不存在,跳過指令載入");
    } else {
      console.error("❌ 載入指令時發生錯誤:", error);
    }
  }
}

/**
 * 載入事件處理器
 */
async function loadEvents() {
  const eventsPath = join(__dirname, "events");

  try {
    const eventFiles = (await readdir(eventsPath)).filter((file) =>
      file.endsWith(".js")
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const event = await import(`file://${filePath}`);
      const eventModule = event.default;

      if (eventModule.once) {
        client.once(eventModule.name, (...args) =>
          eventModule.execute(...args)
        );
      } else {
        client.on(eventModule.name, (...args) => eventModule.execute(...args));
      }

      console.log(`✅ 已載入事件: ${eventModule.name}`);
    }
  } catch (error) {
    console.error("❌ 載入事件時發生錯誤:", error);
    throw error;
  }
}

/**
 * 錯誤處理
 */
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

/**
 * 啟動 Bot
 */
async function startBot() {
  try {
    console.log("🚀 Bot 正在啟動中...");

    // 載入事件和指令
    await loadEvents();
    await loadCommands();

    // 登入 Discord
    await client.login(config.discord.token);
  } catch (error) {
    console.error("❌ Bot 啟動失敗:", error);
    process.exit(1);
  }
}

// 啟動 Bot
startBot();
