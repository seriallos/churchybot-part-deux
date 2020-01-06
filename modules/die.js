import { getChurchybotCommand } from '../util';

export default client => {
  client.on('message', message => {
    const command = getChurchybotCommand(message);
    if (command === 'die') {
      console.log('die requested');
      message.channel.send('Restarting bot...');
      setTimeout(() => process.exit(0), 1 * 1000);
    }
  });
}
