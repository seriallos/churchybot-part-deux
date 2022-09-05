import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'node:url';

import Promise from 'bluebird';

import _ from 'lodash';
import { add, formatRelative } from 'date-fns';
import * as chrono from 'chrono-node';

import { getChurchybotCommand } from '../util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// how often to check to see if a reminder should be announced
const CHECK_INTERVAL = 5 * 1000;

const REMINDER_DB = path.join(__dirname, '..', 'data', 'remind.json');

const load = async () => {
  const contents = await fs.promises.readFile(REMINDER_DB);
  return JSON.parse(contents);
};

const save = async (reminders) => {
  const data = JSON.stringify(reminders, null, 2);
  await fs.promises.writeFile(REMINDER_DB, data);
}

const timeframeToDuration = {
  year: 'years',
  years: 'years',
  month: 'months',
  months: 'months',
  week: 'weeks',
  weeks: 'weeks',
  day: 'days',
  days: 'days',
  hour: 'hours',
  hours: 'hours',
  minute: 'minutes',
  minutes: 'minutes',
  // just for testing
  second: 'seconds',
  seconds: 'seconds',
};

function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    return Math.round(elapsed/1000) + ' seconds ago';
  }

  else if (elapsed < msPerHour) {
    return Math.round(elapsed/msPerMinute) + ' minutes ago';
  }

  else if (elapsed < msPerDay ) {
    return Math.round(elapsed/msPerHour ) + ' hours ago';
  }

  else if (elapsed < msPerMonth) {
    return 'about ' + Math.round(elapsed/msPerDay) + ' days ago';
  }

  else if (elapsed < msPerYear) {
    return 'about ' + Math.round(elapsed/msPerMonth) + ' months ago';
  }

  else {
    return 'about ' + Math.round(elapsed/msPerYear ) + ' years ago';
  }
}

export default async (client) => {
  let nextId = 1;
  let reminders = [];
  try {
    reminders = await load();
    nextId = _.get(_.maxBy(reminders, 'id'), 'id', 0) + 1;
  } catch (error) {
    console.error('remind: Unable to load reminders DB, starting with empty quotes');
  }

  console.log(`remind: Loaded ${reminders.length} reminders`);

  let checkReminders;
  checkReminders = async () => {
    const now = new Date().getTime();

    const pastDue = _.filter(reminders, r => r.when < now);

    if (pastDue.length > 0) {
      console.log(`remind: ${pastDue.length} reminders are ready for reporting`);
      const guild = client.guilds.cache.first();

      await Promise.map(pastDue, async reminder => {
        // find channel
        const channel = guild.channels.cache.find(c => c.id === reminder.channelId);
        const relativeDate = timeDifference(new Date(), new Date(reminder.created));

        if (channel) {
          channel.send(
            `<@${reminder.whoId}> wanted the channel to be reminded about "${reminder.reminder}" `
            + `(created ${relativeDate})`
          );
          reminders = _.reject(reminders, { id: reminder.id });
          await save(reminders);
        }
      });
    }

    setTimeout(checkReminders, CHECK_INTERVAL);
  };

  client.on('ready', () => {
    checkReminders();
  });

  client.on('messageCreate', async (message) => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    /*

    remind channel [what] [when]

    */

    const command = getChurchybotCommand(message);
    if (command.match(/^remind/)) {
      let matches;
      let what;
      let when;
      if (matches = command.match(/^remind channel (.*)$/)) {
        const [, input] = matches;

        const now = new Date();
        const chronoOptions = {
          forwardDate: true,
        };

        const parsedDate = chrono.parse(input, now, chronoOptions);
        when = chrono.parseDate(input, now, chronoOptions);

        if (!when) {
          message.channel.send(`Unable to determine a reminder date`);
          console.error('Unable to determine reminder date!');
          console.error('input: ', input);
          return;
        }

        const text = _.trim(input.substr(0, _.last(parsedDate).index), ' "\'');

        // remove some filler words from the start/end of the text
        const trimStartWords = [
          'me',
          'us',
          'to',
          'that',
          'about',
        ];
        const trimEndWords = [
          'on',
          'at',
          'in',
        ];

        const words = _.dropRightWhile(
          _.dropWhile(
            _.split(text, ' '),
            word => _.includes(trimStartWords, word),
          ),
          word => _.includes(trimEndWords, word),
        );

        const reminder = _.trim(_.join(words, ' '));

        if (!reminder) {
          message.channel.send(`Unable to parse reminder, make sure date is at the end`);
          console.error('Unable to determine reminder text!');
          console.error('input: ', input);
          console.error('when: ', when);
          console.error('trimmed text: ', text);
          return;
        }

        what = reminder;
      /*
      } else if (matches = command.match(/^remind (.*?) (in )?(\d+) (\w+)$/)) {
        const [, reminder, , periodNum, periodTimeframe] = matches;

        if (!timeframeToDuration[periodTimeframe]) {
          message.channel.send(`"${periodTimeframe}" is not a valid time frame`);
          return;
        }

        const num = parseInt(periodNum, 10);
        if (_.isNaN(num) || num <= 0) {
          message.channel.send(`"${periodNum}" is not a valid number for the time frame`);
          return;
        }

        const duration = {};
        duration[timeframeToDuration[periodTimeframe]] = periodNum;

        when = add(new Date(), duration);
        what = reminder;
      } else if (matches = command.match(/^remind (.*?) (on )?(\w+) (\d+)$/)) {
        const [, reminder, , month, day] = matches;

        console.log(month, day);

        what = reminder;
      } else {
        message.channel.send('Invalid remind format. General format is "remind channel [what] [when]"');
        console.log(`ooc: invalid reminder request`);
        */
      }


      if (what && when) {
        const newReminder = {
          id: nextId,
          who: message.author.username,
          whoId: message.author.id,
          created: new Date().getTime(),
          channel: message.channel.name,
          channelId: message.channel.id,
          when: when.getTime(),
          whenHuman: when.toJSON(),
          reminder: what,
        };

        reminders.push(newReminder);
        nextId += 1;
        await save(reminders);

        message.channel.send('Reminder has been stored');
        console.log(`remind: Reminder stored: ${message.author.username}, ${what}, ${when.toJSON()}`);
      }
    }
  });
}
