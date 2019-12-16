import Discord from 'discord.js';
import got from 'got';

export default (client) => {
  const PREFIXES = ['churchybot dadjoke', 'dadjoke'];

  const url = 'https://icanhazdadjoke.com/';

  const response = await got(url);

  const results = JSON.parse(response.body);

  const joke = results.joke;

  return joke;
}
