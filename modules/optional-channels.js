const OPTIONAL_CATEGORY = 'Optional Channels';

const ROLE_CHANNEL = 'channel-setup';

export default client => {
  client.on('ready', () => {
    const guild = client.guilds.first();
    const everyone = guild.roles.find(r => r.name === '@everyone');

    // find optional channels
    const category = guild.channels.find(c => c.name === OPTIONAL_CATEGORY);
    const channels = guild.channels.filter(c => {
      return c.parent && c.parent.name === OPTIONAL_CATEGORY && c.name !== ROLE_CHANNEL;
    });

    // ensure roles exist for these channels
    channels.every(async c => {
      console.log(`Ensuring optional channel "${c.name}" permissions`);
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
      c.overwritePermissions(everyone, {
        READ_MESSAGES: false,
        VIEW_CHANNEL: false,
      });

      // ensure channel can be seen by the role
      c.overwritePermissions(role, {
        READ_MESSAGES: true,
        VIEW_CHANNEL: true,
      });
    });
  });
}
