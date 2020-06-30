import fs from 'fs';
import path from 'path';

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
  const dbData = await load();

  const getRoleName = channel => `c:${channel.name}`;

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
  client.on('channelDelete', channel => {
    // delete role name if it exists
    const roleName = getRoleName(channel);
    const role = channel.guild.roles.find(r => r.name === roleName);
    if (role) {
      log('Deleting role for an optional channel');
      role.delete('Optional channel was deleted, cleaning up connected role');
    }
  });
}
