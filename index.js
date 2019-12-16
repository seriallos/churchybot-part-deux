import fs from 'fs';
import path from 'path';

import _ from 'lodash';

import Discord from 'discord.js';

console.log('ChurchyBot starting');

const MODULES_DIR = path.join(__dirname, 'modules');

async function main() {
  // check for valid environment
  const TOKEN = process.env.CHURCHYBOT_DISCORD_TOKEN;

  if (!TOKEN) {
    console.error('CHURCHYBOT_DISCORD_TOKEN env var is not set up, terminating');
    process.exit(1);
  }

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
    module.default(client);
  }

  // set up discord events

  client.on('ready', () => console.log('Discord client ready'));
  client.on('error', error => console.error('Discord client error', error));
  client.on('warn', warning => console.error('Discord client warning', warning));
  client.on('reconnecting', () => console.log('Discord client reconnecting'));
  client.on('resume', () => console.log('Discord client resume'));

  // actually log the bot in

  console.log('Discord client login');
  client.login(TOKEN);
}

main();