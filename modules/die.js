import { getChurchybotCommand } from '../util';

export default client => {
  client.on('message', message => {
    const command = getChurchybotCommand(message);
    if (command === 'die') {
      console.log('die requested');
      message.channel.send('Restarting bot in 5 seconds...');
      setTimeout(() => process.exit(0), 5 * 1000);
    }
  });
}
