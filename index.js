import fs from 'fs';
import path from 'path';

import _ from 'lodash';

import Discord, { GatewayIntentBits, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';

import { ChannelType } from 'discord-api-types/v10';

import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      devChannel.send({ content: msg });
    }
  };

  const client = new Discord.Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
  });

  // load modules

  const dir = await fs.promises.opendir(MODULES_DIR);
  const modules = [];
  const commands = [];
  const interactions = {};
  for await (const entry of dir) {
    console.log('>> Loading module:', entry.name);
    const module = await import(path.join(__dirname, 'modules', entry.name));
    if (!_.isFunction(module.default)) {
      console.error('Invalid module!', entry.name, 'does not have a function as the default export');
      console.error('Modules should look something like:');
      console.error('  export default (client) => { /* do stuff */ }');
      process.exit(2);
    }

    await module.default(client);

    // single command export mode
    if (module.command) {
      if (module.execute) {
        interactions[module.command.name] = module.execute;
      } else {
        console.error(`Module ${entry.name} has a slash command but no execute() handler!`);
        process.exit(3);
      }

      commands.push(module.command);
    }

    // multiple command export mode
    if (module.commands) {
      _.each(module.commands, ({ command, execute }) => {
        interactions[command.name] = execute;
        commands.push(command);
      });
    }
  }

  // register commands with REST API

  // Dave's test server and test bot
  const testGuildId = '398645287926628362';
  const testClientId = '805262898943229963';
  const realClientId = '655917018339475485';

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(testClientId, testGuildId),
      {
        body: _.map(commands, command => command.toJSON()),
      },
    );
    console.log('Test commands updated');
  } catch (error) {
    if (error.code === 20012) {
      console.log('Not authorized to update test commands');
    } else {
      console.error('Unable to PUT test commands');
      console.error(error);
      process.exit(4);
    }
  }

  try {
    await rest.put(
      Routes.applicationCommands(realClientId),
      {
        body: _.map(commands, command => command.toJSON()),
      },
    );
    console.log('Prod commands updated');
  } catch (error) {
    if (error.code === 20012) {
      console.log('Not authorized to update prod commands');
    } else {
      console.error('Unable to PUT prod commands');
      console.error(error);
      process.exit(5);
    }
  }

  // set up interaction handler

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    console.log(`Received interaction ${interaction.commandName}`);

    const execute = interactions[interaction.commandName];

    if (execute) {
      await execute(interaction);
    } else {
      await interaction.reply('Unknown interaction received. Might be a slash command in testing, might be a crazy error');
    }
  });

  // set up discord events

  client.on('ready', async () => {
    console.log('Discord client ready');
    const guild = client.guilds.cache.first();
    devChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL);
    // join all threads
    const response = await guild.channels.fetchActiveThreads();
    guild.channels.cache.each(channel => {
      if (channel.type === ChannelType.PublicThread) {
        if (channel.joinable) {
          console.log('Joining thread', channel.name);
          channel.join();
        }
      }
    });
    if (!started) {
      devLog('Bot started');
      started = true;
    }
  });

  client.on('threadCreate', thread => {
    if (thread.joinable) {
      console.log('Joining thread', thread.name);
      thread.join();
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
