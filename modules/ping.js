import { getChurchybotCommand } from '../util.js';

export default (client) => {
  client.on('messageCreate', message => {
    if (getChurchybotCommand(message) === 'ping') {
      message.channel.send({ content: 'pong' });
      console.log('ping requested');
    }
  });
};
