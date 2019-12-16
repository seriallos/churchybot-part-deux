import Discord from 'discord.js';

console.log('ChurchyBot starting');

async function main() {
  const client = new Discord.Client();

  const TOKEN = process.env.CHURCHYBOT_DISCORD_TOKEN;

  client.on('ready', () => console.log('Discord client ready'));
  client.on('error', error => console.error('Discord client error', error));
  client.on('warn', warning => console.error('Discord client warning', warning));
  client.on('reconnecting', () => console.log('Discord client reconnecting'));
  client.on('reconnecting', () => console.log('Discord client reconnecting'));

  client.login(TOKEN);

  client.on('message', message => {
    if (message.content === 'ping') {
      message.channel.send('pong');
    }
  });
}

main();
