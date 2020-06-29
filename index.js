import fs from 'fs';
import path from 'path';

import _ from 'lodash';

import Discord from 'discord.js';

console.log('ChurchyBot starting');

const MODULES_DIR = path.join(__dirname, 'modules');

const LOG_CHANNEL = 'developers-developers';

async function main() {
  // check for valid environment
  const TOKEN = process.env.CHURCHYBOT_DISCORD_TOKEN;

  if (!TOKEN) {
    console.error('CHURCHYBOT_DISCORD_TOKEN env var is not set up, terminating');
    process.exit(1);
  }

  let started = false;
  let devChannel;
  const devLog = msg => {
    if (devChannel) {
      devChannel.send(msg);
    }
  };
  const client = new Discord.Client();

  // load modules

  const dir = await fs.promises.opendir(MODULES_DIR);
  const modules = [];
  for await (const entry of dir) {
    console.log('Loading module:', entry.name);
    const module = await import(path.join(__dirname, 'modules', entry.name));
    if (!_.isFunction(module.default)) {
      console.error('Invalid module!', entry.name, 'does not have a function as the default export');
      console.error('Modules should look something like:');
      console.error('  export default (client) => { /* do stuff */ }');
      process.exit(2);
    }
    await module.default(client);
  }

  // set up discord events

  client.on('ready', () => {
    console.log('Discord client ready');
    const guild = client.guilds.first();
    devChannel = guild.channels.find(c => c.name === LOG_CHANNEL);
    if (!started) {
      devLog('Bot started');
      started = true;
    }
  });
  client.on('error', error => {
    console.error('Discord client error', error);
    devLog(`Client error: ${error.message}`);
  });
  client.on('warn', warning => {
    console.error('Discord client warning', warning);
    devLog(`Client warning: ${warning.message}`);
  });
  client.on('reconnecting', () => console.log('Discord client reconnecting'));
  client.on('resume', () => console.log('Discord client resume'));
  client.on('rateLimit', rateLimitInfo => {
    console.log('Discord client encountered a rate limit');
    console.log(rateLimitInfo);
  });

  // actually log the bot in

  console.log('Discord client login');
  client.login(TOKEN);
}

main();
