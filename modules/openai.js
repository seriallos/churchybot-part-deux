import path from 'path';

import Discord, { SlashCommandBuilder } from 'discord.js';
import got from 'got';
import { nanoid } from 'nanoid';
import { Storage } from '@google-cloud/storage';

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.CHURCHYBOT_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const storage = new Storage();

const BUCKET = 'churchybot';

const sizes = {
  small: '256x256',
  medium: '512x512',
  large: '1024x1024',
};

const log = (...args) => {
  console.log('openai:', ...args);
};

const replyWithImage = async (responder, { prompt, num = 1, size = 'large' }) => {
  await responder.deferReply();

  try {
    const image = await openai.images.generate({
      prompt,
      n: num,
      size: sizes[size],
      response_format: 'b64_json',
    });

    const data = image.data[0].b64_json;

    // save in google storage
    const bucket = storage.bucket(BUCKET);
    const filename = path.join('dalle', `${nanoid()}.png`);
    const file = bucket.file(filename);
    await file.save(Buffer.from(data, 'base64'));
    await file.makePublic();

    const imageUrl = `https://storage.googleapis.com/churchybot/${filename}`;

    await responder.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setFooter({ text: prompt })
          .setImage(imageUrl),
      ],
    });
  } catch (error) {
    console.error('something bad happened', error);
    await responder.editReply('**Error:** ' + (error.response?.error?.message || error.message || 'unknown'));
  }
};

const replyWithCompletion = async (responder, { prompt }) => {
  await responder.deferReply();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a helpful Discord bot. Your responses should be limited to 500 characters. Use markdown when appropriate.',
      }, {
        role: 'user',
        content: prompt,
      }],
    });

    await responder.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle(prompt)
          .setDescription(completion.choices[0].message.content),
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
    log('Received dalle interaction');
    const prompt = interaction.options.getString('prompt');
    log('prompt =', prompt);
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
  ),
  execute: async (interaction) => {
    log('Received ChatGPT interaction');
    const prompt = interaction.options.getString('prompt');
    log('prompt =', prompt);
    replyWithCompletion(interaction, {
      prompt,
    });
  },
}];

export default async (client) => {
  if (!OPENAI_API_KEY) {
    console.warn('Missing env vars for openai: CHURCHYBOT_OPENAI_API_KEY');
    console.warn('OpenAI commands are disabled!');
  } else {
    // do stuff
  }
}
