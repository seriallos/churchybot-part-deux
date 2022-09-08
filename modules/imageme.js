import Discord, { SlashCommandBuilder } from 'discord.js';
import _ from 'lodash';
import got from 'got';
import Promise from 'bluebird';

import { getChurchybotCommand } from '../util.js';

const SPOILER_CHANNELS = [
];

const COLLAPSE_SHIFT_CHANNEL = 'image-me-roulette';

const CSE_ID = process.env.CHURCHYBOT_GOOGLE_CSE_ID;
const CSE_KEY = process.env.CHURCHYBOT_GOOGLE_CSE_KEY;

const lastChannelImageMessage  = {};

let collapseChannel;

const makeEmbed = (searchText, imageUrl) => {
  return new Discord.EmbedBuilder()
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

const replyWithImage = async (responder, { text, num = 1, animate = false, spoiler = false }) => {
  let deferred = false;
  if (responder.deferReply) {
    // if called from a slash command since it might take longer than 3 seconds
    await responder.deferReply();
    deferred = true;
  } else if (responder.sendTyping) {
    responder.sendTyping();
  } else if (responder.channel.sendTyping) {
    responder.channel.sendTyping();
  }

  const results = await search(text, animate);
  const channelName = _.toLower(responder.channel?.name);
  let canCollapse = channelName !== COLLAPSE_SHIFT_CHANNEL;

  await Promise.each(_.sampleSize(results, num), async (imageUrl, i) => {
    let sentMessage;
    let fn = (...args) => responder.reply(...args);
    if (i === 0 && deferred) {
      fn = (...args) => responder.editReply(...args);
    } else if (i > 0 && responder.followUp) {
      // have to use followUp for interactions for (n+1)th message
      fn = (...args) => responder.followUp(...args);
    }
    if (spoiler) {
      sentMessage = await fn(`|| ${imageUrl} ||`);
    } else {
      const embed = makeEmbed(text, imageUrl);
      sentMessage = await fn({ embeds: [ embed ] });
    }

    if (responder.fetchReply) {
      // if this was an interaction, we need to look up the actual message object
      sentMessage = await responder.fetchReply();
    }

    if (canCollapse) {
      lastChannelImageMessage[channelName] = sentMessage;
    }
  });
};

const collapse = async (responder) => {
  const channelName = _.toLower(responder.channel?.name);
  const lastMessage = lastChannelImageMessage[channelName];
  if (channelName === COLLAPSE_SHIFT_CHANNEL) {
    responder.reply('Cannot collapse in this channel');
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
      await collapseChannel.send({ embeds: [prevEmbed] });
      const collapsedEmbed = new Discord.EmbedBuilder().setTitle(collapseText);
      lastMessage.edit({ embeds: [collapsedEmbed] });
    }
  } else {
    console.log(`imageme: ${channelName}: Nothing in MRU image channel history`);
    responder.reply('Nothing to collapse (most recent already collapsed or nothing in memory)');
  }
};

export const commands = [{
  command: new SlashCommandBuilder()
    .setName('imageme')
    .setDescription('Random google image search')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('The google image search text')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('spoiler')
        .setDescription('Add spoiler tags to image?')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    console.log('Received imageme interaction');
    const text = interaction.options.getString('text');
    const spoiler = interaction.options.getBoolean('spoiler');
    replyWithImage(interaction, {
      text,
      spoiler,
    });
  },
}, {
  command: new SlashCommandBuilder()
    .setName('animateme')
    .setDescription('Random google image search (animated)')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('The google image search text')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('spoiler')
        .setDescription('Add spoiler tags to image?')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    console.log('Received animateme interaction');
    const text = interaction.options.getString('text');
    const spoiler = interaction.options.getBoolean('spoiler');
    replyWithImage(interaction, {
      text,
      spoiler,
      animate: true,
    });
  },
}, {
  command: new SlashCommandBuilder()
    .setName('pugbomb')
    .setDescription('Many pugs'),
  execute: async (interaction) => {
    console.log('Received pug bomb interaction');
    replyWithImage(interaction, {
      text: 'cute pug',
      num: 5,
    });
  },
}, {
  command: new SlashCommandBuilder()
    .setName('kittybomb')
    .setDescription('Many cats'),
  execute: async (interaction) => {
    console.log('Received kitty bomb interaction');
    replyWithImage(interaction, {
      text: 'cute kitty',
      num: 5,
    });
  },
}, {
  command: new SlashCommandBuilder()
    .setName('pikabomb')
    .setDescription('Many pika'),
  execute: async (interaction) => {
    console.log('Received pike bomb interaction');
    replyWithImage(interaction, {
      text: 'pika',
      num: 5,
    });
  },
}, {
  command: new SlashCommandBuilder()
    .setName('collapse')
    .setDescription('Collapse the last image/animate result'),
  execute: async (interaction) => {
    console.log('Received collapse interaction');
    await collapse(interaction);
    await interaction.reply({ content: 'Image collapsed',  ephemeral: true });
  },
}];


export default (client) => {
  client.on('ready', () => {
    const guild = client.guilds.cache.first();
    collapseChannel = guild.channels.cache.find(c => c.name === COLLAPSE_SHIFT_CHANNEL);
  });

  if (!CSE_ID || !CSE_KEY) {
    console.warn('Missing env vars for image me: CHURCHYBOT_GOOGLE_CSE_ID or CHURCHYBOT_GOOGLE_CSE_KEY');
    console.warn('"image me" and "animate me" are disabled!');
  } else {
    client.on('messageCreate', async message => {
      if (message.author.bot) {
        return;
      }

      try {
        const channelName = _.toLower(message.channel.name);

        let matches;
        let searchText;
        let numImages = 1;
        let animated = false;
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
        } else if (getChurchybotCommand(message) === 'collapse') {
          await collapse(message);
        }

        if (searchText) {
          console.log(
            `imageme: ${channelName}: Searching for "${searchText}", animated: ${animated}, numImages: ${numImages}`,
          );
          replyWithImage(message, {
            text: searchText,
            num: numImages,
            animate: animated,
            spoiler,
          });
        }
      } catch (err) {
        console.error('imageme: Error!', err.message);
        console.error(err);
      }
    });
  }
}
