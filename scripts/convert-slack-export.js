import fs from 'fs';
import path from 'path';

import _ from 'lodash';

const IGNORE_USERS = new Set([
  'ChurchyBot',
]);

const log = (...args) => process.stderr.write(args.join(' ') + '\n');

async function main(source) {
  log(source);
  const dirEntries = await fs.promises.opendir(source);
  const rawFiles = [];
  for await (const file of dirEntries) {
    rawFiles.push(file.name);
  }

  const files = rawFiles.sort();

  const userMap = {};

  for await (const file of files) {
    let curEntry;
    try {
      log('Processing', file);
      const content = await fs.promises.readFile(path.join(source, file));
      const entries = JSON.parse(content);
      _.each(entries, entry => {
        curEntry = entry;
        if (entry.user_profile) {
          userMap[entry.user] = _.get(entry, 'user_profile.display_name') || _.get(entry, 'user_profile.real_name');
        }
        if (entry.type === 'message' && !entry.subtype) {
          // ignore bot messages
          if (entry.bot_profile) {
            return;
          }

          // ignore any specific users in the ignore list
          const speakerName = _.get(entry, 'user_profile.real_name');
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
        }
      });
    } catch (error) {
      log('Error processing entry:', error.message);
      log(JSON.stringify(curEntry, null, 2));
    }
  }
}

const source = process.argv[2];
if (source) {
  main(source);
} else {
  console.log('Must provide a channel directory from a Slack export');
  console.log('npx babel-node convert-slack-export.js /path/to/slack-export/channel');
}

