import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'node:url';

import _ from 'lodash';
import Discord, { SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPEAT_THRESHOLD = 60 * 1000;

const DB_FILE = path.join(__dirname, '..', 'data', 'plusplus.json');

let plusplus = {
  scores: [],
  reasons: [],
}
let recentChanges = [];

const load = async () => {
  const contents = await fs.promises.readFile(DB_FILE);
  return JSON.parse(contents);
};

const save = async (db) => {
  const data = JSON.stringify(db);
  await fs.promises.writeFile(DB_FILE, data);
}

const scoresSummary = async (responder) => {
  console.log('plusplus: scores requested');
  const topScores = _.take(_.reverse(_.sortBy(plusplus.scores, 'score')), 10);
  const bottomScores = _.take(_.sortBy(plusplus.scores, 'score'), 10);

  const embed = new Discord.EmbedBuilder();
  embed.setTitle('Scores');
  embed.addFields([
    { name: 'Top Scores', value: _.map(topScores, s => `${s.subject}: ${s.score}`).join('\n'), inline: true },
    { name: '\u200b', value: '\u200b', inline: true },
    { name: 'Bottom Scores', value: _.map(bottomScores, s => `${s.subject}: ${s.score}`).join('\n'), inline: true },
  ]);
  responder.reply({ embeds: [ embed ]});
};

const subjectScore = async (responder, rawSubject) => {
  const subject = _.toLower(rawSubject);

  console.log(`plusplus: score for ${subject} requested`);
  const result = _.find(plusplus.scores, { subject });
  if (result) {
    const numReasons = 6;

    const reasons = _.sortBy(_.filter(plusplus.reasons, { subject }), 'score');
    const plusReasons = _.map(
      _.reverse(_.takeRight(_.filter(reasons, r => r.score > 0), numReasons)),
      reason => `${reason.reason}: ${reason.score}`,
    );
    const negReasons = _.map(
      _.take(_.filter(reasons, r => r.score < 0), numReasons),
      reason => `${reason.reason}: ${reason.score}`,
    );

    const embed = new Discord.EmbedBuilder();
    embed.setTitle(`${subject}`);
    embed.setDescription(`**${result.score}** points`);
    embed.addFields([
      { name: 'Positive Raisins', value: plusReasons.join('\n') || 'None', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Negative Raisins', value: negReasons.join('\n') || 'None', inline: true },
    ]);
    responder.reply({ embeds: [ embed ]});
    console.log(`plusplus: score for ${subject} sent`);
  } else {
    responder.reply(`"${subject}" is not in the database`);
    console.log(`plusplus: score for ${subject} not found`);
  }
};

const updateScore = async (responder, rawSubject, amount, rawReason) => {
  const now = new Date().getTime();

  const subject = _.trim(_.toLower(rawSubject));
  const reason = _.trim(_.toLower(rawSubject));

  const author = _.toLower(responder.author?.username || responder.user?.username);
  if (subject === author) {
    console.log(`plusplus: user denied self adjust`);
    responder.reply('You cannot plus/neg yourself');
    return;
  }

  // clean up old recent changes
  const numPrevChanges = recentChanges.length;
  recentChanges = _.reject(recentChanges, change => {
    const age = now - change.when;
    return age >= REPEAT_THRESHOLD;
  });
  if (numPrevChanges !== recentChanges.length) {
    console.log(`Cleaned up ${numPrevChanges - recentChanges.length} recentChanges entries`);
  }

  // check for an author/subject rate limit
  const recentChange = _.find(recentChanges, { author, subject });
  if (recentChange) {
    responder.reply('Too soon, executus');
    console.log(`plusplus: user denied adjust due to author/subject rate limiting`);
    return;
  }

  const index = _.findIndex(plusplus.scores, { subject });
  let item;
  if (index > -1) {
    item = plusplus.scores[index];
  } else {
    item = {
      subject,
      score: 0,
    };
    plusplus.scores.push(item);
  }
  item.score += amount;

  recentChanges.push({
    author,
    subject,
    when: now,
  });

  let response = `${subject} has ${item.score} point${item.score !== 1 ? 's' : ''}`;
  if (reason) {
    const reasonIndex = _.findIndex(plusplus.reasons, { subject, reason });
    let reasonItem;
    if (reasonIndex > -1) {
      reasonItem = plusplus.reasons[reasonIndex];
    } else {
      reasonItem = {
        subject,
        reason,
        score: 0,
      };
      plusplus.reasons.push(reasonItem);
    }
    reasonItem.score += amount;
    response += `, ${reasonItem.score} of which is for "${reason}"`;
  }
  await save(plusplus);
  responder.reply(response);
  console.log(`plusplus: score updated for ${subject} by ${author}`);
};


export const commands = [{
  command: new SlashCommandBuilder()
    .setName('scores')
    .setDescription('Show the top and bottom 10 scores')
    .addStringOption(option =>
      option.setName('what')
        .setDescription('Get detailed score for a single subject')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    console.log('Received scores interaction');
    const subject = interaction.options.getString('what');
    if (subject) {
      await subjectScore(interaction, subject);
    } else {
      await scoresSummary(interaction);
    }
  },
}, {
  command: new SlashCommandBuilder()
    .setName('plusplus')
    .setDescription('Increment the score of something')
    .addStringOption(option =>
      option.setName('what')
        .setDescription('What is getting the +1')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('why')
        .setDescription('Why is it getting the +1?')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const subject = interaction.options.getString('what');
    const reason = interaction.options.getString('why');
    await updateScore(interaction, subject, +1, reason);
  },
}, {
  command: new SlashCommandBuilder()
    .setName('minusminus')
    .setDescription('Decrement the score of something')
    .addStringOption(option =>
      option.setName('what')
        .setDescription('What is getting the -1')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('why')
        .setDescription('Why is it getting the -1?')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const subject = interaction.options.getString('what');
    const reason = interaction.options.getString('why');
    await updateScore(interaction, subject, -1, reason);
  },
}];

export default async (client) => {
  try {
    plusplus = await load();
  } catch (error) {
    console.error('Unable to load plusplus DB, starting with empty data');
  }

  console.log(`Loaded ${plusplus.scores.length} subjects`);

  client.on('messageCreate', async (message) => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    const command = getChurchybotCommand(message);
    if (command) {
      let matches;
      if (command === 'scores') {
        await scoresSummary(message);
      } else if (matches = command.match(/score (.*)$/)) {
        const subject = _.toLower(matches[1]);
        await subjectScore(message, subject);
      }
    } else {
      let matches;
      if (matches = message.content.match(/^([^+-]+)(\+\+|--)( for (.*))?$/)) {
        const [, rawSubject, plusOrNeg, , rawReason] = matches;
        const subject = _.trim(_.toLower(rawSubject));

        const reason = _.trim(_.toLower(rawReason));
        const adjust = plusOrNeg === '++' ? 1 : -1;

        await updateScore(message, subject, adjust, reason);
      }
    }
  });
}
