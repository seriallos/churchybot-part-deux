import _ from 'lodash';

import Discord, { SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

export const command = new SlashCommandBuilder()
  .setName('xcard')
  .setDescription('Play an X-card because you are not comfortable and want the current conversation to stop.');

export const execute = async (responder) => {
  console.log('x-card requested');
  const user = responder.author || responder.user;
  const embed = new Discord.EmbedBuilder()
    .setImage('https://storage.googleapis.com/raidbots/misc/x-card.png')
    .setDescription(`
      ${user.username} is not comfortable with the current conversation and wishes for it to stop.

      They don't need to explain why. It doesn't matter why.
    `);

  responder.reply({
    embeds: [ embed ],
  });
}

const COMMAND_ALIASES = [
  'x-card',
  'xcard',
  'x card',
];

export default (client) => {
  client.on('messageCreate', message => {
    if (_.includes(COMMAND_ALIASES, getChurchybotCommand(message))) {
      execute(message);
    }
  });
};
