export default (client) => {
  client.on('message', message => {
    if (message.content === 'ping') {
      message.channel.send('pong');
    }
  });
};
