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
    
    if (getChurchybotCommand(message).match(/^talk to me ?(about)(.+)$/)) {
      let seedText = "well, actually";
      let parts
      if (parts = message.content.match(/^talk to me ?(about)(.+)/i)) {
        seedText = parts.slice[-1](0)
      }
      console.log('sentence requested');
      message.channel.startTyping();
      const response = await got.post(url, {json: {length: 45, nsamples: 1, temperature: 0.75, prefix: seedText }});
      const results = JSON.parse(response.body);

      const text = results.text;

      message.channel.send(text);
      message.channel.stopTyping();
    } else {
      const roll = 100 * _.random(0, 1, true);
      if (roll < CHATTINESS) {
        message.channel.startTyping();
        // Use the last couple of words of the message as the text generation seed
        seedText = message.content.split(" ").splice(-2).join(" ")
        
        const response = await got.post(url, {json: {length: 45, nsamples: 1, temperature: 0.75, prefix: seedText}});
        const results = JSON.parse(response.body);
        const text = results.text;
        
        message.channel.send(text);
        message.channel.stopTyping();
    }
    }
  });
}
