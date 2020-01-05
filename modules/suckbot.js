import Discord from 'discord.js';
import got from 'got';
import _ from 'lodash';

import { getChurchybotCommand } from '../util';

// Control how often the bot spouts off at random
const CHATTINESS = 1;

export default (client) => {
  const PREFIXES = ['churchybot', 'suckbot'];

  const url = 'https://suckbot-fwxfu3dz3a-ue.a.run.app';

  client.on('message', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    let matches;
    if (matches = getChurchybotCommand(message).match(/^talk to me( about (.+))?$/)) {
      try {
        const seedText = matches[2] || "well, actually";

        console.log(`suckbot: talk to me requested, seedText: ${seedText}`);

        message.channel.startTyping();
        const response = await got.post(url, {json: {length: 45, nsamples: 1, temperature: 0.75, prefix: seedText }});
        const results = JSON.parse(response.body);

        const text = results.text;

        message.channel.stopTyping();
        message.channel.send(text);
      } catch (error) {
        // stop all typing, not just a single count
        message.channel.stopTyping(true);
        message.channel.send('A SuckBot error has occurred: ', error.message);
      }
    } else {
      const roll = 100 * _.random(0, 1, true);
      if (roll < CHATTINESS) {
        message.channel.startTyping();
        // Use the last couple of words of the message as the text generation seed
        seedText = message.content.split(" ").splice(-2).join(" ")

        const response = await got.post(url, {json: {length: 45, nsamples: 1, temperature: 0.75, prefix: seedText}});
        const results = JSON.parse(response.body);
        const text = results.text;

        message.channel.stopTyping();
        message.channel.send(text);
      }
    }
  });
}
