import fs from 'fs';
import path from 'path';

import _ from 'lodash';

import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPTIONAL_CATEGORY = 'Optional Channels';

const ROLE_CHANNEL = 'channel-setup';

const DB_FILE = path.join(__dirname, '..', 'data', 'optchan.json');

const load = async () => {
  try {
    const contents = await fs.promises.readFile(DB_FILE);
    return JSON.parse(contents);
  } catch (error) {
    console.error('Unable to load optchan DB:', error.message);
  }
};

const save = async (db) => {
  try {
    const data = JSON.stringify(db, null, 2);
    await fs.promises.writeFile(DB_FILE, data);
  } catch (error) {
    console.error('Unable to save optchan DB:', error.message);
  }
}

const log = (...msg) => console.log('optchan:', ...msg);

export default async client => {
  log('Loading optchan databse');
  let dbData = {};
  try {
    dbData = await load() || {};
  } catch (error) {
    console.error('Unable to load optchan database');
  }

  const getRoleName = channel => `c:${channel.name}`;

  const getRole = channel => channel.guild.roles.cache.find(r => r.name === getRoleName(channel));

  const getReactionChannel = reaction => {
    return _.find(dbData, { message: reaction.message.id });
  };

  const ensureChannel = async channel => {
    const guild = channel.guild;
    if (channel.parent && channel.parent.name === OPTIONAL_CATEGORY && channel.name !== ROLE_CHANNEL) {
      log(`Ensuring optional channel "${channel.name}" permissions`);
      const roleName = getRoleName(channel);
      let role = channel.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        log(`Creating role "${roleName}"`);
        role = await channel.guild.roles.create({
          name: roleName,
          reason: 'Optional channel role creation',
        });
      } else {
        log(`Role "${roleName}" already exists`);
      }

      // ensure channel is private
      const everyone = guild.roles.cache.find(r => r.name === '@everyone');
      channel.permissionOverwrites.create(everyone, {
        ViewChannel: false,
      }, 'Ensure optional channel is private');

      // ensure channel can be seen by the role
      channel.permissionOverwrites.create(role, {
        ViewChannel: true,
      }, 'Ensure optional channel role can view');

      if (!dbData[channel.name]) {
        // ensure appropriate reaction exists in ROLE_CHANNEL
        log(`Create message and reaction for ${channel.name}`);
        const setupChannel = guild.channels.cache.find(c => c.name === ROLE_CHANNEL);
        if (setupChannel) {
          const message = await setupChannel.send(`${channel.name}`);
          const reaction = await message.react('✅');
          dbData[channel.name] = {
            message: message.id,
            key: channel.name,
          };
          await save(dbData);
        } else {
          log(`Cannot find ${ROLE_CHANNEL} channel, bailing`);
        }
      }
    } else {
      log(`"${channel.name}" is not an optional channel, skipping ensure`);
    }
  };

  const ensureGuild = guild => {
    // find optional channels
    const category = guild.channels.cache.find(c => c.name === OPTIONAL_CATEGORY);
    const channels = guild.channels.cache.filter(c => {
      return c.parent && c.parent.name === OPTIONAL_CATEGORY && c.name !== ROLE_CHANNEL;
    });

    // ensure roles exist for these channels
    channels.every(ensureChannel);

    // Disable most posting in the setup channel
    const setupChannel = guild.channels.cache.find(c => c.name === ROLE_CHANNEL);
    if (setupChannel) {
      const everyone = guild.roles.cache.find(r => r.name === '@everyone');
      setupChannel.permissionOverwrites.create(everyone, {
        SendMessages: false,
      }, 'Ensure setup channel is not public writable');

      setupChannel.messages.fetch({ limit: 100 });
    }
  };

  client.on('ready', () => {
    const guild = client.guilds.cache.first();

    ensureGuild(guild);
  });

  client.on('channelUpdate', (oldChannel, newChannel) => {
    // only ensure if the channel has moved parents
    // blindly ensuring on channelUpdate results in infinite recursion
    if (oldChannel.parentID !== newChannel.parentID) {
      log(`"${newChannel.name}" has moved parents, running ensureChannel`);
      ensureChannel(newChannel)}
    }
  );
  client.on('channelCreate', channel => {
    log(`New channel "${channel.name}" created, running ensureChannel`);
    ensureChannel(channel)
  });
  client.on('channelDelete', async (channel) => {
    // delete role name if it exists
    const roleName = getRoleName(channel);
    const role = channel.guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      log('Deleting role for an optional channel');
      role.delete('Optional channel was deleted, cleaning up connected role');

      const reactionInfo = _.find(dbData, { key: channel.name });
      const setupChannel = channel.guild.channels.cache.find(c => c.name === ROLE_CHANNEL);
      if (setupChannel) {
        try {
          const message = await setupChannel.messages.fetch(reactionInfo.message);
          if (message) {
            message.delete();
          }
        } catch (error) {
          log(`Error! Unable to delete reaction message for ${channel.name}:`, error.message);
        }

        delete dbData[channel.name];
        await save(dbData);
      }

    }
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    const reactionChannel = getReactionChannel(reaction);
    if (reactionChannel) {
      const guild = reaction.message.channel.guild;
      const channel = guild.channels.cache.find(c => c.name === reactionChannel.key);
      const roleName = getRoleName(channel);
      const role = guild.roles.cache.find(r => r.name === roleName);
      log(`Adding ${roleName} to ${user.username}...`);
      const member = await guild.members.cache.get(user.id);
      await member.roles.add(role);
      log(`Added ${roleName} to ${user.username}`);
    }
  });
  client.on('messageReactionRemove', async (reaction, user) => {
    const reactionChannel = getReactionChannel(reaction);
    if (reactionChannel) {
      const guild = reaction.message.channel.guild;
      const channel = guild.channels.cache.find(c => c.name === reactionChannel.key);
      const roleName = getRoleName(channel);
      const role = guild.roles.cache.find(r => r.name === roleName);
      log(`Removing ${roleName} from ${user.username}...`);
      const member = await guild.members.cache.get(user.id);
      await member.roles.remove(role);
      log(`Removed ${roleName} from ${user.username}`);
    }
  });
}
