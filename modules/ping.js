import { getChurchybotCommand } from '../util.js';

export default (client) => {
  client.on('message', message => {
    if (getChurchybotCommand(message) === 'ping') {
      message.channel.send('pong');
      console.log('ping requested');
    }
  });
};
