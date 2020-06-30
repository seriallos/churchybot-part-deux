import fs from 'fs';
import path from 'path';

import _ from 'lodash';

const OPTIONAL_CATEGORY = 'Optional Channels';

const ROLE_CHANNEL = 'channel-setup';

const DB_FILE = path.join(__dirname, '..', 'data', 'optchan.json');

const load = async () => {
  const contents = await fs.promises.readFile(DB_FILE);
  return JSON.parse(contents);
};

const save = async (db) => {
  const data = JSON.stringify(db);
  await fs.promises.writeFile(DB_FILE, data);
}

const log = (...msg) => console.log('optchan:', ...msg);

export default async client => {
  log('Loading optchan databse');
  const dbData = await load();

  const getRoleName = channel => `c:${channel.name}`;

  const getRole = channel => channel.guild.roles.find(r => r.name === getRoleName(channel));

  const getReactionChannel = reaction => {
    return _.find(dbData, { message: reaction.message.id });
  };

  const ensureChannel = async channel => {
    const guild = channel.guild;
    if (channel.parent && channel.parent.name === OPTIONAL_CATEGORY && channel.name !== ROLE_CHANNEL) {
      log(`Ensuring optional channel "${channel.name}" permissions`);
      const roleName = getRoleName(channel);
      let role = channel.guild.roles.find(r => r.name === roleName);
      if (!role) {
        log(`Creating role "${roleName}"`);
        role = await channel.guild.createRole({
          name: roleName,
        }, 'Optional channel role creation');
      } else {
        log(`Role "${roleName}" already exists`);
      }

      // ensure channel is private
      const everyone = guild.roles.find(r => r.name === '@everyone');
      channel.overwritePermissions(everyone, {
        READ_MESSAGES: false,
        VIEW_CHANNEL: false,
      }, 'Ensure optional channel is private');

      // ensure channel can be seen by the role
      channel.overwritePermissions(role, {
        READ_MESSAGES: true,
        VIEW_CHANNEL: true,
      }, 'Ensure optional channel role can view');

      if (!dbData[channel.name]) {
        // ensure appropriate reaction exists in ROLE_CHANNEL
        log(`Create message and reaction for ${channel.name}`);
        const setupChannel = guild.channels.find(c => c.name === ROLE_CHANNEL);
        const message = await setupChannel.send(`${channel.name}`);
        const reaction = await message.react('✅');
        dbData[channel.name] = {
          message: message.id,
          reaction: reaction.id,
          key: channel.name,
        };
        await save(dbData);
      }
    } else {
      log(`"${channel.name}" is not an optional channel, skipping ensure`);
    }
  };

  const ensureGuild = guild => {
    // find optional channels
    const category = guild.channels.find(c => c.name === OPTIONAL_CATEGORY);
    const channels = guild.channels.filter(c => {
      return c.parent && c.parent.name === OPTIONAL_CATEGORY && c.name !== ROLE_CHANNEL;
    });

    // ensure roles exist for these channels
    channels.every(ensureChannel);

    // Disable most posting in the setup channel
    const setupChannel = guild.channels.find(c => c.name === ROLE_CHANNEL);
    const everyone = guild.roles.find(r => r.name === '@everyone');
    setupChannel.overwritePermissions(everyone, {
      SEND_MESSAGES: false,
    }, 'Ensure setup channel is not public writable');

    setupChannel.fetchMessages({ limit: 100 });
  };

  client.on('ready', () => {
    const guild = client.guilds.first();

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
    const role = channel.guild.roles.find(r => r.name === roleName);
    if (role) {
      log('Deleting role for an optional channel');
      role.delete('Optional channel was deleted, cleaning up connected role');

      const reactionInfo = _.find(dbData, { key: channel.name });
      const setupChannel = channel.guild.channels.find(c => c.name === ROLE_CHANNEL);
      const message = await setupChannel.fetchMessage(reactionInfo.message);
      message.delete();

      delete dbData[channel.name];
      await save(dbData);
    }
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    const reactionChannel = getReactionChannel(reaction);
    if (reactionChannel) {
      const guild = reaction.message.channel.guild;
      const channel = guild.channels.find(c => c.name === reactionChannel.key);
      const roleName = getRoleName(channel);
      const role = guild.roles.find(r => r.name === roleName);
      log(`Adding ${roleName} to ${user.username}`);
      const member = await guild.fetchMember(user.id);
      member.addRole(role);
    }
  });
  client.on('messageReactionRemove', async (reaction, user) => {
    const reactionChannel = getReactionChannel(reaction);
    if (reactionChannel) {
      const guild = reaction.message.channel.guild;
      const channel = guild.channels.find(c => c.name === reactionChannel.key);
      const roleName = getRoleName(channel);
      const role = guild.roles.find(r => r.name === roleName);
      log(`Removing ${roleName} from ${user.username}`);
      const member = await guild.fetchMember(user.id);
      member.removeRole(role);
    }
  });
}
