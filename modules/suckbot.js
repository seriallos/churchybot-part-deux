import Discord, { SlashCommandBuilder } from 'discord.js';
import got from 'got';
import _ from 'lodash';

import { getChurchybotCommand } from '../util.js';

// Control how often the bot spouts off at random
const CHATTINESS = 0.0;

const url = 'https://suckbot-fwxfu3dz3a-ue.a.run.app';

const fetchText = async ({
  prefix = '',
  length = 60,
  nsamples = 1,
  temperature = 0.75,
}) => {
  const response = await got.post(url, {json: {length, nsamples, temperature, prefix }});
  const results = JSON.parse(response.body);

  let text = results.text;

  // find last period and trim any hanging text
  text = text.substring(0, 1 + text.lastIndexOf('.'));

  return text;
};

const talkToMe = async (responder, prompt = '', crazy = false) => {
  try {
    let deferred = false;
    let prefix = '';
    let temperature = 0.75;
    prefix = prompt || '';
    if (crazy) {
      temperature = 0.99;
    }

    console.log(`suckbot: talk to me requested, seedText: ${prefix}, temperature: ${temperature}`);

    if (responder.sendTyping) {
      // if called from typing in a channel
      responder.sendTyping();
    }
    if (responder.deferReply) {
      // if called from a slash command since it might take longer than 3 seconds
      await responder.deferReply();
      deferred = true;
    }

    const start = Date.now();

    const text = await fetchText({ prefix, temperature });

    const duration = Date.now() - start;

    console.log(`suckbot: talk to me response ${duration}ms: "${text}"`);

    if (deferred) {
      await responder.editReply(text);
    } else {
      await responder.reply(text);
    }
  } catch (error) {
    console.error(`suckbot: error! ${error.message}`);
    console.error(error);
    responder.reply(`A SuckBot error has occurred: ${error.message}`);
  }
};

export const commands = [{
  command: new SlashCommandBuilder()
    .setName('suckbot')
    .setDescription('Get a taste of our own medicine (machine learning text creation based on our chat)')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Give it some prompt text to generate from')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('crazy')
        .setDescription('Make the text a little crazier')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    console.log('Received suckbot interaction');
    const prompt = interaction.options.getString('prompt');
    const crazy = interaction.options.getBoolean('crazy');

    await talkToMe(interaction, prompt, crazy);
  },
}];

export default (client) => {
  const PREFIXES = ['churchybot', 'suckbot'];


  client.on('messageCreate', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    let matches;

    if (matches = getChurchybotCommand(message).match(/^(crazy )?talk to me( about (.+))?$/)) {
      await talkToMe(message, matches[3], matches[1]);
    } else {
      try {
        const roll = 100 * _.random(0, 1, true);
        if (roll < CHATTINESS) {
          // Use the last couple of words of the message as the text generation seed
          const prefix = message.content.split(" ").splice(-2).join(" ")

          console.log(`suckbot: chatty rolled with prefix "${prefix}" (${roll} rolled, threshold ${CHATTINESS})`);

          message.channel.sendTyping();

          const text = await fetchText({ prefix });

          message.channel.send(text);
        }
      } catch (error) {
        message.channel.send(`A chatty SuckBot error has occurred: ${error.message}`);
        console.log(error);
      }
    }
  });
}
