import Discord from 'discord.js';
import _ from 'lodash';

const triggers = [{
  listen: /(tv mount|mission accomplished|job well done)/i,
  image: 'https://i.imgur.com/ZidtWtL.jpg',
}, {
  listen: /YACHTS/,
  image: 'https://i.imgur.com/Cln9dqs.png',
}, {
  listen: /shocked$/i,
  image: 'https://media.giphy.com/media/AaQYP9zh24UFi/giphy.gif',
}, {
  listen: /(fry not sure|^not sure if)/i,
  image: 'http://giphygifs.s3.amazonaws.com/media/ANbD1CCdA3iI8/giphy.gif',
}, {
  listen: /tapping/,
  image: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
}, {
  listen: /(money crying|wiping tears)/i,
  image: 'http://giphygifs.s3.amazonaws.com/media/94EQmVHkveNck/giphy.gif',
}, {
  listen: /my fetish/i,
  image: [
    'http://giphygifs.s3.amazonaws.com/media/JxFLe8raHIYhy/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/41io4H3B7wSti/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/2sWVvF0wMkIyQ/giphy.gif',
    'https://media.giphy.com/media/u6MSNuAAIMaWc/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/IPgIu0v6z77c4/giphy.gif'
  ],
}, {
  listen: /(fillion|mal) (facepalm|confused|speechless)/i,
  image: 'https://media.giphy.com/media/vUEznRmVQfG2Q/giphy.gif',
}, {
  listen: /take my money/i,
  image: 'http://i.imgur.com/QlmfC.jpg',
}, {
  listen: /wrong\./i,
  image: 'https://media2.giphy.com/media/ceeN6U57leAhi/giphy.gif',
}, {
  listen: /what did you think/i,
  image: 'https://media.giphy.com/media/YP6GvHrK2bo1q/giphy.gif',
}, {
  listen: /rimshot/,
  image: [
    'http://giphygifs.s3.amazonaws.com/media/SUeUCn53naadO/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/1gArwncRlXac8GIhNy8/giphy.gif',
    'https://media.giphy.com/media/AR0MThYLSnmGQ/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/ItAmGFb0uiZz2/giphy.gif',
    'https://media.giphy.com/media/fWgPzLGeI4okiaG8QT/giphy.gif',
    'https://media.giphy.com/media/3oFzmhMIcKK846ku5i/giphy.gif',
    'http://giphygifs.s3.amazonaws.com/media/gKYpJXuvVeryo/giphy.gif'
  ],
}, {
  listen: /ChurchyBot are you alive/i,
  image: 'https://giphy.com/gifs/game-of-thrones-got-arya-stark-9RKLlD2oz5c7m',
}, {
  listen: /turbine/i,
  text: 'POWERED BY OUR FANS',
}, {
  listen: /so say we all/i,
  image: 'https://media.giphy.com/media/NM4E1FcXQK6oE/giphy.gif',
}, {
  listen: /ding dong/i,
  image: 'https://live.staticflickr.com/81/267944636_13df6e11c3_b.jpg',
}];

const makeEmbed = (imageUrl) => {
  return new Discord.RichEmbed()
    .setURL(imageUrl)
    .setImage(imageUrl);
};

export default (client) => {
  client.on('message', async message => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }
    try {
      _.each(triggers, async ({ listen, text, image }) => {
        let match = false;
        if (_.isRegExp(listen) && listen.test(message.content)) {
          match = true;
        } else if (message.content.match(listen)) {
          match = true;
        }
        if (match) {
          console.log('quips: matched', listen, message.content);
          let msg;
          if (image) {
            if (_.isArray(image)) {
              msg = _.sample(image);
            } else {
              msg = image;
            }
            console.log('quips: sending image embed');
            const embed = makeEmbed(msg);
            await message.channel.send(embed);
            console.log('quips: sent image embed');
          } else if (text) {
            let msg;
            if (_.isString(text)) {
              msg = text;
            } else if (_.isArray(text)) {
              msg = _.sample(text);
            }
            console.log('quips: sending text');
            await message.channel.send(msg);
            console.log('quips: sent text');
          }
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('quipc: exception', error.message);
      console.error(error);
    }
  });
};
