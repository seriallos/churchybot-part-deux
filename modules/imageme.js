import Discord from 'discord.js';
import _ from 'lodash';
import got from 'got';

export default (client) => {
  const PREFIXES = ['image me', 'animate me'];

  const CSE_ID = process.env.CHURCHYBOT_GOOGLE_CSE_ID;
  const CSE_KEY = process.env.CHURCHYBOT_GOOGLE_CSE_KEY;

  const search = async (text, animated) => {
    const query = {
      q: text,
      searchType: 'image',
      safe: 'high',
      fields: 'items(link)',
      cx: CSE_ID,
      key: CSE_KEY,
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

    const item = _.sample(results.items);

    return item.link;
  };

  if (!CSE_ID || !CSE_KEY) {
    console.warn('Missing env vars for image me: CHURCHYBOT_GOOGLE_CSE_ID or CHURCHYBOT_GOOGLE_CSE_KEY');
    console.warn('"image me" and "animate me" are disabled!');
  } else {
    client.on('message', async message => {
      let matches;
      let searchText;
      let animated = false;
      if (matches = message.content.match(/^image me (.+)/)) {
        searchText = matches[1];
      } else if (matches = message.content.match(/^animate me (.+)/)) {
        searchText = matches[1];
        animated = true;
      }

      if (searchText) {
        console.log(`imageme: Searching for "${searchText}", animated: ${animated}`);
        const imgResult = await search(searchText, animated);
        const embed = new Discord.RichEmbed()
          .setTitle(searchText)
          .setURL(imgResult)
          .setImage(imgResult);
        message.channel.send(embed);
      }
    });
  }
}
