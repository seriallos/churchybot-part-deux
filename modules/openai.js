import { SlashCommandBuilder } from 'discord.js';
import got from 'got';

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.CHURCHYBOT_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});


export const execute = async responder => {
  console.log('dadjoke requested');
  const response = await got(url, { headers: { Accept: 'application/json' } });

  const results = JSON.parse(response.body);

  const joke = results.joke;

  responder.reply(joke);
};

const sizes = {
  small: '256x256',
  medium: '512x512',
  large: '1024x1024',
};

const replyWithImage = async (responder, { prompt, num = 1, size = 'medium' }) => {
  await responder.deferReply();

  try {
    const image = await openai.images.generate({
      prompt,
      n: num,
      size: sizes[size],
      response_format: 'url',
    });

    await responder.editReply(image.data[0].url);
  } catch (error) {
    console.error('something bad happened', error);
    await responder.editReply('Something bad happened:', error?.error?.message || error.message || 'unknown');
  }
};

export const commands =[{
  command: new SlashCommandBuilder()
    .setName('dalle')
    .setDescription('Submit a prompt to DALL-E 2')
    .addStringOption(option => 
      option.setName('prompt')
        .setDescription('Prompt text')
        .setRequired(true),
  ),
  execute: async (interaction) => {
    console.log('Received dalle interaction');
    const prompt = interaction.options.getString('prompt');
    console.log('prompt =', prompt);
    replyWithImage(interaction, {
      prompt,
    });
  },
}];

export default (client) => {
  if (!OPENAI_API_KEY) {
    console.warn('Missing env vars for openai: CHURCHYBOT_OPENAI_API_KEY');
    console.warn('OpenAI commands are disabled!');
  } else {
    client.on('messageCreate', async message => {
      // ignore bot messages
      if (message.author.bot) {
        return;
      }
      if (message.content.match(/^dad ?joke$/)) {
        execute(message);
      }
    });
  }
}
