import Discord from 'discord.js';
import got from 'got';

export default (client) => {
  const PREFIXES = ['churchybot', 'suckbot'];

  const url = 'https://suckbot-fwxfu3dz3a-ue.a.run.app';

  client.on('message', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }
    if (message.content.match(/^talk to ?me$/)) {
      console.log('sentence requested');
      const response = await got.post(url, {json: {length: 45, nsamples=1, temperature=0.75 }}).json();

      const results = JSON.parse(response.body);

      const text = results.text;

      message.channel.send(text);
    }
  });
}
