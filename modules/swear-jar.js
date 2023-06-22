/*

Swear Jar

Listens for "bad words" and keeps tally of who uses them

*/
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'node:url';

import _ from 'lodash';
import Discord, { SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

const BAD_WORDS = [
  'elon',
  'musk',

  'trump',

  'comics sans',

  'test message',
];

const REPEAT_THRESHOLD = 60 * 1000;

const BAD_WORDS_REGEX = new RegExp(
  '(' + _.join(BAD_WORDS, '|') + ')',
  'i',
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_FILE = path.join(__dirname, '..', 'data', 'swear-jar.json');

const DEFAULT_DATA = {
  entries: [],
};

let swearJar;

const load = async () => {
  const contents = await fs.promises.readFile(DB_FILE);
  return JSON.parse(contents);
};

const save = async (db) => {
  const data = JSON.stringify(db);
  await fs.promises.writeFile(DB_FILE, data);
}

const log = (...args) => console.log('swear-jar:', ...args);

const addEntry = async (who, what, context) => {
  swearJar.entries.push({
    who: _.trim(_.toLower(who)),
    what: _.trim(_.toLower(what)),
    context,
    when: new Date().toJSON(),
  });
  console.log(swearJar);
  await save(swearJar);
};

const summary = async (responder) => {
  const speakers = _.sortBy(_.groupBy(swearJar.entries, 'who'), _.size);

  const embed = new Discord.EmbedBuilder();
  embed.setTitle('Swear Jar');
  embed.addFields([
    {
      name: 'Offenders',
      value: _.map(speakers, s => `${s[0].who}: $${s.length}`).join('\n'),
      inline: true,
    },
  ]);

  await responder.reply({ embeds: [ embed ] });
};

export const commands = [{
  command: new SlashCommandBuilder()
    .setName('swearjar')
    .setDescription('Show who owes the swear jar'),
    /*
    .addStringOption(option =>
      option.setName('what')
        .setDescription('Get detailed score for a single bad word')
        .setRequired(false)
    ),
    */
  execute: async (interaction) => {
    console.log('Received swearJar interaction');
    const subject = interaction.options.getString('what');
    if (subject) {
      await subjectSummary(interaction, subject);
    } else {
      await summary(interaction);
    }
  },
}];

export default async (client) => {
  try {
    swearJar = await load();
  } catch (error) {
    log('Unable to load swear-jar DB, starting with empty data');
    swearJar = DEFAULT_DATA;
  }

  log(`Loaded ${swearJar.entries.length} entries`);

  client.on('messageCreate', async (message) => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    const matches = message.content.match(BAD_WORDS_REGEX);
    if (matches) {
      const badWord = matches[1];
      await addEntry(message.author.username, badWord, message.content);
      message.reply(`Put a dollar in the swear jar, ${message.author.username}. "${badWord}" is a bad word around here`);
    }
  });
};
