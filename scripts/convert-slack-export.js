import fs from 'fs';
import path from 'path';

import _ from 'lodash';
import printf from 'printf';

const IGNORE_USERS = new Set([
  'churchybot',
  'Slackbot',
]);

const log = (...args) => process.stderr.write(args.join(' ') + '\n');

async function main(source) {
  log(source);
  const dirEntries = await fs.promises.opendir(source);
  const rawFiles = [];
  for await (const file of dirEntries) {
    if (file.isDirectory()) {
      const subEntries = await fs.promises.opendir(path.join(source, file.name));
      for await (const subFile of subEntries) {
        rawFiles.push(path.join(source, file.name, subFile.name));
      }
    } else {
      rawFiles.push(path.join(source, file.name));
    }
  }

  const files = rawFiles.sort();

  const userMap = {};

  let count = 0;
  let dayCounts = [];
  let speakerCounts = {};

  for await (const file of files) {
    let curEntry;
    let dayCount = 0;
    try {
      log('Processing', file);
      const content = await fs.promises.readFile(file);
      const entries = JSON.parse(content);
      _.each(entries, entry => {
        curEntry = entry;
        const speakerName = _.get(entry, 'user_profile.display_name') || _.get(entry, 'user_profile.real_name');
        if (entry.user_profile) {
          userMap[entry.user] = speakerName;
        }
        if (entry.type === 'message' && !entry.subtype) {
          // ignore bot messages
          if (entry.bot_profile) {
            return;
          }

          // ignore any specific users in the ignore list
          if (IGNORE_USERS.has(speakerName)) {
            return;
          }

          // ignore attachments
          if (entry.attachments) {
            return;
          }

          let text = _.trim(entry.text);

          // remove churchybot commands?

          // unwrap links?

          // convert mentions to usernames
          let mentionMatch;
          while (mentionMatch = text.match(/\<@(U[a-zA-Z0-9]+)\>/)) {
            text = _.replace(text, mentionMatch[0], userMap[mentionMatch[1]] || '');
          }

          // convert channel mentions to channel names
          let channelMatch;
          while (channelMatch = text.match(/(\<#(C[a-z0-9_-]+)\|([a-z0-9_-]*)\>)/i)) {
            text = _.replace(text, channelMatch[0], `#${channelMatch[3]}`);
          }

          // decode some HTML entities
          text = _.replace(text, /&gt;/g, '>');
          text = _.replace(text, /&lt;/g, '<');
          text = _.replace(text, /&amp;/g, '&');
          text = _.replace(text, /&apos;/g, '\'');

          // trim again
          text = _.trim(text);

          if (text) {
            console.log(text);
          }

          dayCount += 1;
          if (speakerName) {
            if (!speakerCounts[speakerName]) {
              speakerCounts[speakerName] = 0;
            }
            speakerCounts[speakerName] += 1;
          }
        }
      });
    } catch (error) {
      log('Error processing entry:', error.message);
      log(JSON.stringify(curEntry, null, 2));
    }
    const base = path.basename(file);
    const [year, month, day] = _.split(_.replace(base, '.json', ''), '-');
    dayCounts.push({
      date: base,
      year,
      month,
      day,
      count: dayCount,
    });
  }

  const minDay = _.minBy(dayCounts, 'count');
  const maxDay = _.maxBy(dayCounts, 'count');
  const speakers = _.reverse(_.sortBy(_.map(speakerCounts, (count, speaker) => ({ speaker, count })), 'count'));

  log('Year Breakdown');
  log('--------------');
  _.each(_.groupBy(dayCounts, 'year'), (stats, year) => {
    const total = _.sumBy(stats, 'count');
    const avg = _.round(total / 365);
    const maxDay = _.maxBy(stats, 'count');
    const date = _.replace(maxDay.date, '.json', '');
    const maxCount = maxDay.count.toLocaleString();
    log(`${year}    Msgs: ${printf('%8s', total.toLocaleString())}    Msgs per day: ${avg}`);
  });

  log();
  log('Total Messages (Top 10)');
  log('-----------------------');
  _.each(_.take(speakers, 10), ({ speaker, count }) => log(printf('  %8s  %-20s', count.toLocaleString(), speaker)));
}

const source = process.argv[2];
if (source) {
  main(source);
} else {
  console.log('Must provide a channel directory from a Slack export');
  console.log('npx babel-node convert-slack-export.js /path/to/slack-export/channel');
}

