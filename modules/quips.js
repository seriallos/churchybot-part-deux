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
  image: 'https://giphy.com/gifs/story-conversation-topic-vUEznRmVQfG2Q',
}, {
  listen: /take my money/i,
  image: 'http://i.imgur.com/QlmfC.jpg',
}, {
  listen: /wrong\./i,
  image: 'https://giphy.com/gifs/ceeN6U57leAhi',
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
      console.log('input:', message.content);
      _.each(triggers, ({ listen, text, image }) => {
        let match = false;
        if (_.isRegExp(listen) && listen.test(message.content)) {
          match = true;
        } else if (message.content.match(listen)) {
          match = true;
        }
        if (match) {
          console.log('matched', listen);
          let msg;
          if (image) {
            if (_.isArray(image)) {
              msg = _.sample(image);
            } else {
              msg = image;
            }
            console.log('sending image embed');
            const embed = makeEmbed(msg);
            message.channel.send(embed);
          } else if (text) {
            let msg;
            if (_.isString(text)) {
              msg = text;
            } else if (_.isArray(text)) {
              msg = _.sample(text);
            }
            console.log('sending text');
            message.channel.send(msg);
          }
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Exception thrown:', error.message);
      console.error(error);
    }
  });
};
