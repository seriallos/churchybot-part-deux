import Discord from 'discord.js';
import _ from 'lodash';
import got from 'got';

import { getChurchybotCommand } from '../util.js';

const SPOILER_CHANNELS = [
];

const COLLAPSE_SHIFT_CHANNEL = 'image-me-roulette';

export default (client) => {
  const CSE_ID = process.env.CHURCHYBOT_GOOGLE_CSE_ID;
  const CSE_KEY = process.env.CHURCHYBOT_GOOGLE_CSE_KEY;

  const lastChannelImageMessage  = {};

  let collapseChannel;

  client.on('ready', () => {
    const guild = client.guilds.cache.first();
    collapseChannel = guild.channels.cache.find(c => c.name === COLLAPSE_SHIFT_CHANNEL);
  });

  const makeEmbed = (searchText, imageUrl) => {
    return new Discord.MessageEmbed()
      .setTitle(searchText)
      .setURL(imageUrl)
      .setImage(imageUrl);
  };

  const search = async (text, animated) => {
    const start = 1 + (10 * _.random(0, 9));
    const query = {
      q: text,
      searchType: 'image',
      safe: 'high',
      fields: 'items(link)',
      cx: CSE_ID,
      key: CSE_KEY,
      start,
    };
    if (animated) {
      query.fileType = 'gif';
      query.hq = 'animated';
      query.tbs = 'itp:animated';
    }

    const url = 'https://www.googleapis.com/customsearch/v1';

    const response = await got(url, {
      searchParams: query,
    });

    const results = JSON.parse(response.body);

    return _.map(results.items, 'link');
  };

  if (!CSE_ID || !CSE_KEY) {
    console.warn('Missing env vars for image me: CHURCHYBOT_GOOGLE_CSE_ID or CHURCHYBOT_GOOGLE_CSE_KEY');
    console.warn('"image me" and "animate me" are disabled!');
  } else {
    client.on('message', async message => {
      if (message.author.bot) {
        return;
      }

      try {
        const channelName = _.toLower(message.channel.name);

        let matches;
        let searchText;
        let numImages = 1;
        let animated = false;
        let canCollapse = channelName !== COLLAPSE_SHIFT_CHANNEL;
        let spoiler = _.includes(SPOILER_CHANNELS, channelName);

        if (matches = message.content.match(/^(spoiler )?image me (.+)/i)) {
          spoiler = spoiler || Boolean(matches[1]);
          searchText = matches[2];
        } else if (matches = message.content.match(/^(spoiler )?animate me (.+)/i)) {
          spoiler = spoiler || Boolean(matches[1]);
          searchText = matches[2];
          animated = true;
        } else if (matches = message.content.match(/^(pug|pika|kitty) ?bomb$/i)) {
          const searchMap = {
            pug: 'cute pug',
            kitty: 'cute kitty',
          };
          searchText = searchMap[matches[1]] || matches[1];
          numImages = 5;
          // do not track / allow collapse on bombs
          canCollapse = false;
        } else if (getChurchybotCommand(message) === 'collapse') {
          const lastMessage = lastChannelImageMessage[channelName];
          if (channelName === COLLAPSE_SHIFT_CHANNEL) {
            message.channel.send('Cannot collapse in this channel');
          } else if (lastMessage) {
            console.log(`imageme: ${channelName}: Collapsed last image`);
            lastChannelImageMessage[channelName] = null;
            await collapseChannel.send(`Image collapsed from ${channelName}:`);
            const collapseText = `Collapsed and moved to #${COLLAPSE_SHIFT_CHANNEL}`;
            if (lastMessage.content) {
              await collapseChannel.send(lastMessage.content);
              lastMessage.edit(collapseText);
            } else if (lastMessage.embeds.length > 0) {
              const prevEmbed = lastMessage.embeds[0];
              const embed = new Discord.MessageEmbed(lastMessage.embeds[0]);
              await collapseChannel.send(embed);
              const collapsedEmbed = new Discord.MessageEmbed().setTitle(collapseText);
              lastMessage.edit(collapsedEmbed);
            }
          } else {
            console.log(`imageme: ${channelName}: Nothing in MRU image channel history`);
            message.channel.send('Nothing to collapse (most recent already collapsed or nothing in memory)');
          }
        }

        if (searchText) {
          console.log(
            `imageme: ${channelName}: Searching for "${searchText}", animated: ${animated}, numImages: ${numImages}`,
          );
          message.channel.startTyping();
          const results = await search(searchText, animated);
          _.each(_.sampleSize(results, numImages), async imageUrl => {
            let sentMessage;
            if (spoiler) {
              sentMessage = await message.channel.send(`|| ${imageUrl} ||`);
            } else {
              const embed = makeEmbed(searchText, imageUrl);
              sentMessage = await message.channel.send(embed);
            }

            if (canCollapse) {
              lastChannelImageMessage[channelName] = sentMessage;
            }
          });
        }
      } catch (err) {
        console.error('imageme: Error!', err.message);
        console.error(err);
      } finally {
        message.channel.stopTyping();
      }
    });
  }
}
