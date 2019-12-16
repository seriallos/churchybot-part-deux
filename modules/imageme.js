import Discord from 'discord.js';
import _ from 'lodash';
import got from 'got';

export default (client) => {
  const CSE_ID = process.env.CHURCHYBOT_GOOGLE_CSE_ID;
  const CSE_KEY = process.env.CHURCHYBOT_GOOGLE_CSE_KEY;

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
      let matches;
      let searchText;
      let numImages = 1;
      let animated = false;
      if (matches = message.content.match(/^image me (.+)/)) {
        searchText = matches[1];
      } else if (matches = message.content.match(/^animate me (.+)/)) {
        searchText = matches[1];
        animated = true;
      } else if (matches = message.content.match(/^(pug|pika|kitty) ?bomb$/)) {
        const searchMap = {
          pug: 'cute pug',
          kitty: 'cute kitty',
        };
        searchText = searchMap[matches[1]] || matches[1];
        numImages = 5;
      }

      if (searchText) {
        console.log(`imageme: Searching for "${searchText}", animated: ${animated}, numImages: ${numImages}`);
        const results = await search(searchText, animated);
        _.each(_.sampleSize(results, numImages), imageUrl => {
          const embed = new Discord.RichEmbed()
            .setImage(imageUrl);
          message.channel.send(embed);
        });
      }
    });
  }
}
