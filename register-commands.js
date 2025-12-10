import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './src/config/env.js';

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'src/commands');

try {
  const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    const commandModule = command.default;

    if ('data' in commandModule) {
      commands.push(commandModule.data.toJSON());
      console.log(`✅ 已載入指令: ${commandModule.data.name}`);
    }
  }
} catch (error) {
  console.error('❌ 載入指令時發生錯誤:', error);
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
  try {
    console.log(`\n🚀 開始註冊 ${commands.length} 個斜線指令...`);

    // 開發環境: 註冊到特定伺服器 (即時生效)
    if (config.discord.guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      console.log(`✅ 成功註冊 ${data.length} 個伺服器指令!`);
      console.log(`📍 伺服器 ID: ${config.discord.guildId}`);
    } else {
      // 生產環境: 註冊到全域 (需要 1 小時生效)
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      );
      console.log(`✅ 成功註冊 ${data.length} 個全域指令!`);
      console.log(`⏰ 全域指令需要約 1 小時才會生效`);
    }

    console.log('\n已註冊的指令:');
    commands.forEach(cmd => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ 註冊指令失敗:', error);
    process.exit(1);
  }
})();
