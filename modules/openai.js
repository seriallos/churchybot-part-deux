import _ from 'lodash';
import Discord, { SlashCommandBuilder } from 'discord.js';
import got from 'got';

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.CHURCHYBOT_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const sizes = {
  small: '256x256',
  medium: '512x512',
  large: '1024x1024',
};

const replyWithImage = async (responder, { prompt, num = 1, size = 'large' }) => {
  await responder.deferReply();

  try {
    const image = await openai.images.generate({
      prompt,
      n: num,
      size: sizes[size],
      response_format: 'url',
    });

    const imageUrl = image.data[0].url;

    await responder.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setFooter({ text: prompt })
          .setImage(imageUrl),
      ],
    });

    // TODO: Save the image somewhere else
    // TODO: Figure out if there are any more weird error conditions
  } catch (error) {
    console.error('something bad happened', error);
    await responder.editReply('**Error:** ' + (error.response?.error?.message || error.message || 'unknown'));
  }
};

const replyWithCompletion = async (responder, { prompt, model = 'gpt-3.5-turbo' }) => {
  await responder.deferReply();

  try {
    const start = Date.now();
    const completion = await openai.chat.completions.create({
      model,
      messages: [{
        role: 'system',
        content: 'You are a helpful Discord bot. Your responses should be limited to 500 characters. Use markdown when appropriate.',
      }, {
        role: 'user',
        content: prompt,
      }],
    });
    const duration = Date.now() - start;

    await responder.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle(prompt)
          .setDescription(completion.choices[0].message.content)
          .setFooter({
            text: (
              `Response time: ${_.round(duration).toLocaleString()}ms\n` +
              `Model: ${model}`
            ),
          }),
      ],
    });
  } catch (error) {
    console.error('something bad happened', error);
    await responder.editReply('**Error:** ' + (error.response?.error?.message || error.message || 'unknown'));
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
}, {
  command: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Submit a prompt to ChatGPT')
    .addStringOption(option => 
      option.setName('prompt')
        .setDescription('Prompt text')
        .setRequired(true),
    )
    .addStringOption(option =>
      option.setName('model')
        .setDescription('GPT Model (e.g. gpt-4, gpt-3.5-turbo)')
        .setRequired(false),
    ),
  execute: async (interaction) => {
    console.log('Received ChatGPT interaction');
    const prompt = interaction.options.getString('prompt');
    const model = interaction.options.getString('model');
    console.log('prompt =', prompt);
    replyWithCompletion(interaction, {
      prompt,
      model: model || undefined,
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
