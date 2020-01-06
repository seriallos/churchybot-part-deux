import { getChurchybotCommand } from '../util';

export default client => {
  client.on('message', async message => {
    const command = getChurchybotCommand(message);
    if (command === 'die') {
      console.log('die requested');
      await message.channel.send('Restarting bot...');
      process.exit(0);
    }
  });
}
