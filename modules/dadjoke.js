import Discord from 'discord.js';
import got from 'got';

export default (client) => {
  const PREFIXES = ['churchybot dadjoke', 'dadjoke'];

  const url = 'https://icanhazdadjoke.com/';

  client.on('message', async message => {
    if (message.content.match(/^dad ?joke$/)) { 
      const response = await got(url, { headers: { Accept: 'application/json' } });

      const results = JSON.parse(response.body);

      const joke = results.joke;

      message.channel.send(joke);
    }
  });
}
