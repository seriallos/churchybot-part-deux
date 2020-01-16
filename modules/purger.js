/*

Auto-purges messages from configured channels after a certain amount of time

*/
import _ from 'lodash';

const PURGE_INTERVAL = 5 * 60 * 1000;

const niceTime = seconds => {
  const minutes = _.round(seconds / 60);
  const hours = _.round(minutes / 60);
  const days = _.round(hours / 24);
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour{hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute{minutes !== 1 ? 's' : ''}`;
  }
  return `${seconds} second{seconds !== 1 ? 's' : ''}`;
};

const CHANNELS = [{
  name: 'burn-after-reading',
  ttl: 48 * 60 * 60,
}, {
  name: 'image-me-roulette',
  ttl: 48 * 60 * 60,
}];

const purge = async (client, channelName, ttl, topic) => {
  const channel = client.guilds.first().channels.find(c => c.name === channelName);

  if (!channel) {
    console.log(`purger: ${channelName} not found`);
    return;
  }

  channel.setTopic(topic || `This channel automatically deletes messages after ${niceTime(ttl)}`);

  const options = {
    limit: 50,
  };

  let hasMore = true;
  let deletions = 0;

  do {
    const messages = await channel.fetchMessages(options);
    if (messages.size === 0) {
      hasMore = false;
    } else {
      messages.forEach(message => {
        options.before = message.id;
        const age = (new Date().getTime() - message.createdAt.getTime()) / 1000;
        if (age > ttl) {
          message.delete();
          deletions += 1;
        }
      });
    }
  } while (hasMore);

  if (deletions > 0) {
    console.log(`purger: Deleted ${deletions} messages from ${channelName}`);
  }

  setTimeout(() => purge(client, channelName, ttl, topic), PURGE_INTERVAL);
};

export default client => {
  client.on('ready', () => {
    // start purger task
    _.each(CHANNELS, channel => {
      console.log(`purger: started ${channel.name} purger, ttl ${channel.ttl}`);
      purge(client, channel.name, channel.ttl, channel.topic);
    });
  });
}
