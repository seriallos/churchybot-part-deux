import _ from 'lodash';

const PREFIX = 'churchybot';

export const getChurchybotCommand = message => {
  let body;
  if (_.startsWith(message.content, PREFIX)) {
    body = _.replace(message.content, PREFIX, '');
  } else if (message.isMentioned(message.client.user) && message.mentions.users.size === 1) {
    body = _.replace(message.cleanContent, new RegExp(`@${message.client.user.username}`, 'g'), '');
  }

  body = _.trim(body);

  return body;
};
