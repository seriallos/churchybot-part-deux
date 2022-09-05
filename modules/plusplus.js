import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'node:url';

import _ from 'lodash';
import Discord from 'discord.js';

import { getChurchybotCommand } from '../util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPEAT_THRESHOLD = 60 * 1000;

const DB_FILE = path.join(__dirname, '..', 'data', 'plusplus.json');

const load = async () => {
  const contents = await fs.promises.readFile(DB_FILE);
  return JSON.parse(contents);
};

const save = async (db) => {
  const data = JSON.stringify(db);
  await fs.promises.writeFile(DB_FILE, data);
}

export default async (client) => {
  let plusplus = {
    scores: [],
    reasons: [],
  }
  let recentChanges = [];
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
        const topScores = _.take(_.reverse(_.sortBy(plusplus.scores, 'score')), 10);
        const bottomScores = _.take(_.sortBy(plusplus.scores, 'score'), 10);

        const embed = new Discord.EmbedBuilder();
        embed.setTitle('Scores');
        embed.addFields([
          { name: 'Top Scores', value: _.map(topScores, s => `${s.subject}: ${s.score}`).join('\n'), inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: 'Bottom Scores', value: _.map(bottomScores, s => `${s.subject}: ${s.score}`).join('\n'), inline: true },
        ]);
        message.channel.send({ embeds: [ embed ]});
        console.log('plusplus: scores requested');
      } else if (command === 'top 10') {
        const topScores = _.take(_.reverse(_.sortBy(plusplus.scores, 'score')), 10);
        message.channel.send(_.map(topScores, ts => `${ts.subject}: ${ts.score}`).join('\n'));
        console.log('plusplus: top 10 requested');
      } else if (command === 'bottom 10') {
        const bottomScores = _.take(_.sortBy(plusplus.scores, 'score'), 10);
        message.channel.send(_.map(bottomScores, ts => `${ts.subject}: ${ts.score}`).join('\n'));
        console.log('plusplus: bottom 10 requested');
      } else if (matches = command.match(/score (.*)$/)) {
        const subject = _.toLower(matches[1]);
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
          message.channel.send({ embeds: [ embed ]});
          console.log(`plusplus: score for ${subject} sent`);
        } else {
          message.channel.send(`"${subject}" is not in the database`);
          console.log(`plusplus: score for ${subject} not found`);
        }
      }
    } else {
      let matches;
      if (matches = message.content.match(/^([^+-]+)(\+\+|--)( for (.*))?$/)) {
        const [, rawSubject, plusOrNeg, , rawReason] = matches;
        const subject = _.trim(_.toLower(rawSubject));

        const author = _.toLower(message.author.username);
        const reason = _.trim(_.toLower(rawReason));
        const adjust = plusOrNeg === '++' ? 1 : -1;

        if (subject === author) {
          console.log(`plusplus: user denied self adjust`);
          message.channel.send('You cannot plus/neg yourself');
          return;
        }

        // clean up old recent changes
        const numPrevChanges = recentChanges.length;
        recentChanges = _.reject(recentChanges, change => {
          const age = new Date().getTime() - change.when;
          return age >= REPEAT_THRESHOLD;
        });
        if (numPrevChanges !== recentChanges.length) {
          console.log(`Cleaned up ${numPrevChanges - recentChanges.length} recentChanges entries`);
        }

        // check for an author/subject rate limit
        const recentChange = _.find(recentChanges, { author, subject });
        if (recentChange) {
          message.channel.send('Too soon, executus');
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
        item.score += adjust;

        recentChanges.push({
          author,
          subject,
          when: new Date().getTime(),
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
          reasonItem.score += adjust;
          response += `, ${reasonItem.score} of which is for "${reason}"`;
        }
        save(plusplus);
        message.channel.send(response);
        console.log(`plusplus: score updated for ${subject} by ${author}`);
      }
    }
  });
}
