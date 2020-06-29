const OPTIONAL_CATEGORY = 'Optional Channels';

const ROLE_CHANNEL = 'channel-setup';

export default client => {
  client.on('ready', () => {
    const guild = client.guilds.first();

    console.log(guild.roles);

    // find optional channels
    const category = guild.channels.find(c => c.name === OPTIONAL_CATEGORY);
    const channels = guild.channels.filter(c => {
      return c.parent && c.parent.name === OPTIONAL_CATEGORY && c.name !== ROLE_CHANNEL;
    });

    console.log(channels);

    // ensure roles exist for these channels
    channels.every(async c => {
      const roleName = `c:${c.name}`;
      let role = guild.roles.find(r => r.name === roleName);
      if (!role) {
        console.log(`Creating role ${roleName}`);
        role = await guild.createRole({
          name: roleName,
        });
      } else {
        console.log(`Role ${roleName} already exists`);
      }

      // ensure channel is private
      /*
      c.overwritePermissions(role, {
        READ_MESSAGES: false,
        VIEW_CHANNEL: false,
      });
      */

      // ensure channel can be seen by the role
      c.overwritePermissions(role, {
        READ_MESSAGES: true,
        VIEW_CHANNEL: true,
      });
    });
  });
}
