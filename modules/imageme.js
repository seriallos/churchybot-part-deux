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
      let spoiler = false;
      if (matches = message.content.match(/^(spoiler )?image me (.+)/i)) {
        spoiler = Boolean(matches[1]);
        searchText = matches[2];
      } else if (matches = message.content.match(/^(spoiler )?animate me (.+)/i)) {
        spoiler = Boolean(matches[1]);
        searchText = matches[2];
        animated = true;
      } else if (matches = message.content.match(/^(pug|pika|kitty) ?bomb$/i)) {
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
          if (spoiler) {
            message.channel.send(`|| ${imageUrl} ||`);
          } else {
            const embed = new Discord.RichEmbed()
              .setImage(imageUrl);
            message.channel.send(embed);
          }
        });
      }
    });
  }
}
