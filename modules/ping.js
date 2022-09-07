import { SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

export const command = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('One ping only.');

export const execute = async (responder) => {
  console.log('ping requested');
  responder.reply({ content: 'pong', ephemeral: true });
}

export default (client) => {
  client.on('messageCreate', message => {
    if (getChurchybotCommand(message) === 'ping') {
      execute(message);
    }
  });
};
