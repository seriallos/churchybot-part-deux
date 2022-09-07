import { SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

export const command = new SlashCommandBuilder()
  .setName('die')
  .setDescription('Restart the bot');

export const execute = async (responder) => {
  console.log('die requested');
  await responder.reply('Restarting bot...');
  process.exit(0);
}

export default client => {
  client.on('messageCreate', async message => {
    const command = getChurchybotCommand(message);
    if (command === 'die') {
      await execute(message);
    }
  });
}
