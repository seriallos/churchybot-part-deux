import { getChurchybotCommand } from '../util';

export default (client) => {
  client.on('message', message => {
    if (getChurchybotCommand(message) === 'ping') {
      message.channel.send('pong');
    }
  });
};
