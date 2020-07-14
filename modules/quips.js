import Discord from 'discord.js';
import _ from 'lodash';

const triggers = [{
  listen: /(tv mount|mission accomplished|job well done)/i,
  response: 'https://i.imgur.com/ZidtWtL.jpg',
}, {
  listen: /YACHTS/,
  response: 'https://i.imgur.com/Cln9dqs.png',
}];

const makeEmbed = (imageUrl) => {
  return new Discord.RichEmbed()
    .setURL(imageUrl)
    .setImage(imageUrl);
};

export default (client) => {
  client.on('message', async message => {
    _.each(triggers, ({ listen, response }) => {
      let match = false;
      if (_.isRegExp(listen) && listen.test(message.content)) {
        match = true;
      } else if (message.content.match(listen)) {
        match = true;
      }
      if (match) {
        let msg;
        if (_.isArray(response)) {
          msg = _.sample(response);
        } else {
          msg = response;
        }
        const embed = makeEmbed(imageUrl);
        message.channel.send(embed);
        return false;
      }
      return true;
    });
  });
};
