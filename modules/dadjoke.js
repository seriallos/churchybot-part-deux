import { SlashCommandBuilder } from 'discord.js';
import got from 'got';

export const command = new SlashCommandBuilder()
  .setName('dadjoke')
  .setDescription('A dad joke is a short joke, typically a pun, presented as a one-liner or a question and answer.');

const url = 'https://icanhazdadjoke.com/';

export const execute = async responder => {
  console.log('dadjoke requested');
  const response = await got(url, { headers: { Accept: 'application/json' } });

  const results = JSON.parse(response.body);

  const joke = results.joke;

  responder.reply(joke);
};

export default (client) => {
  client.on('messageCreate', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }
    if (message.content.match(/^dad ?joke$/)) {
      execute(message);
    }
  });
}
