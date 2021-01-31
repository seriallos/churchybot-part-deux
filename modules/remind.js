import fs from 'fs';
import path from 'path';

import Promise from 'bluebird';

import _ from 'lodash';
import add from 'date-fns/add';
import formatRelative from 'date-fns/formatRelative';
import * as chrono from 'chrono-node';

import { getChurchybotCommand } from '../util';

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
      const guild = client.guilds.first();

      await Promise.map(pastDue, async reminder => {
        // find channel
        const channel = guild.channels.find(c => c.id === reminder.channelId);
        const relativeDate = formatRelative(new Date(reminder.created), new Date());

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

  client.on('message', async (message) => {
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
      console.log('remind trigger');
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
        console.log(message.author.username, what, when);

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
        console.log(newReminder);

        reminders.push(newReminder);
        nextId += 1;
        await save(reminders);

        message.channel.send('Reminder has been stored');
        console.log(`ooc: Reminder stored.`);
      }
    }
  });
}
