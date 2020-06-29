const OPTIONAL_CATEGORY = 'Optional Channels';

const ROLE_CHANNEL = 'channel-setup';

const ensureChannel = async channel => {
  if (channel.parent && channel.parent.name === OPTIONAL_CATEGORY && channel.name !== ROLE_CHANNEL) {
    console.log(`Ensuring optional channel "${c.name}" permissions`);
    const roleName = `c:${c.name}`;
    let role = channel.guild.roles.find(r => r.name === roleName);
    if (!role) {
      console.log(`Creating role ${roleName}`);
      role = await channel.guild.createRole({
        name: roleName,
      });
    } else {
      console.log(`Role ${roleName} already exists`);
    }

    // ensure channel is private
    const everyone = channel.guild.roles.find(r => r.name === '@everyone');
    channel.overwritePermissions(everyone, {
      READ_MESSAGES: false,
      VIEW_CHANNEL: false,
    });

    // ensure channel can be seen by the role
    channel.overwritePermissions(role, {
      READ_MESSAGES: true,
      VIEW_CHANNEL: true,
    });

    // ensure appropriate reaction exists in ROLE_CHANNEL
  } else {
    console.log(`${channel.name} is not an optional channel, skipping ensure`);
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

export default client => {
  client.on('ready', () => {
    const guild = client.guilds.first();

    ensureGuild(guild);
  });

  client.on('channelUpdate', (oldChannel, newChannel) => ensureChannel(newChannel));
  client.on('channelCreate', ensureChannel);
}
