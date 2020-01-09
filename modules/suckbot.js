import Discord from 'discord.js';
import got from 'got';
import _ from 'lodash';

import { getChurchybotCommand } from '../util';

// Control how often the bot spouts off at random
const CHATTINESS = 1;

export default (client) => {
  const PREFIXES = ['churchybot', 'suckbot'];

  const url = 'https://suckbot-fwxfu3dz3a-ue.a.run.app';

  const fetchText = async ({
    prefix = '',
    length = 60,
    nsamples = 1,
    temperature = 0.75,
  }) => {
    const response = await got.post(url, {json: {length, nsamples, temperature, prefix }});
    const results = JSON.parse(response.body);

    let text = results.text;

    // find last period and trim any hanging text
    text = text.substring(0, 1 + text.lastIndexOf('.'));

    return text;
  };

  client.on('message', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    let matches;

    if (matches = getChurchybotCommand(message).match(/^(crazy )?talk to me( about (.+))?$/)) {
      try {
        let prefix = '';
        let temperature = 0.75;
        prefix = matches[3] || '';
        if (matches[1] === "crazy ") {
          temperature = 0.99;
          prefix = matches[3] || '';
        }

        console.log(`suckbot: talk to me requested, seedText: ${prefix}, temperature: ${temperature}`);

        message.channel.startTyping();

        const text = await fetchText({ prefix, temperature });

        message.channel.stopTyping();
        message.channel.send(text);
      } catch (error) {
        // stop all typing, not just a single count
        message.channel.stopTyping(true);
        message.channel.send(`A SuckBot error has occurred: ${error.message}`);
      }
    } else {
      try {
      const roll = 100 * _.random(0, 1, true);
      if (roll < CHATTINESS) {
        console.log(`suckbot: chatty rolled (${roll} rolled, threshold ${CHATTINESS})`);

        // Use the last couple of words of the message as the text generation seed
        const prefix = message.content.split(" ").splice(-2).join(" ")

        message.channel.startTyping();

        const text = await fetchText({ prefix });

        message.channel.stopTyping();
        message.channel.send(text);
      }
      } catch (error) {
        // stop all typing, not just a single count
        message.channel.stopTyping(true);
        message.channel.send(`A chatty SuckBot error has occurred: ${error.message}`);
      }
    }
  });
}
