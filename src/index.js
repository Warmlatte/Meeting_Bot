const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/env');

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
 * 載入指令
 */
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

// 檢查 commands 目錄是否存在
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ 已載入指令: ${command.data.name}`);
    } else {
      console.warn(`⚠️ 指令 ${file} 缺少必要的 "data" 或 "execute" 屬性`);
    }
  }
}

/**
 * 載入事件處理器
 */
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  console.log(`✅ 已載入事件: ${event.name}`);
}

/**
 * 錯誤處理
 */
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

/**
 * 啟動 Bot
 */
client.login(config.discord.token)
  .then(() => {
    console.log('🚀 Bot 正在啟動中...');
  })
  .catch(error => {
    console.error('❌ Bot 登入失敗:', error);
    process.exit(1);
  });
