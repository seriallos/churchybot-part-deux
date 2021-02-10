import _ from 'lodash';

const PREFIX = 'churchybot';

export const getChurchybotCommand = message => {
  let body;
  if (_.startsWith(_.toLower(message.content), PREFIX)) {
    body = _.replace(message.content, new RegExp(PREFIX, 'i'), '');
  } else if (message.mentions.has(message.client.user) && message.mentions.users.size === 1) {
    body = _.replace(message.content, new RegExp(`<@!${message.client.user.id}>`, 'g'), '');
  }

  body = _.toLower(_.trim(body));

  return body;
};

export const DEVMODE = process.env.NODE_ENV === 'development';
