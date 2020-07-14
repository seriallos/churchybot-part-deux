const triggers = [{
  listen: /(tv mount|mission accomplished|job well done)/i,
  response: 'https://i.imgur.com/ZidtWtL.jpg',
}, {
  listen: /YACHTS/,
  response: 'https://i.imgur.com/Cln9dqs.png',
}];

export default (client) => {
  client.on('message', async message => {
    _.each(triggers, ({ listen, response }) => {
      let match = false;
      if (_.isRegExp(listen) && listen.test(message.content)) {
        match = true;
      } else if (message.match(listen)) {
        match = true;
      }
      if (match) {
        let msg;
        if (_.isArray(response)) {
          msg = _.sample(response);
        } else {
          msg = response;
        }
        message.channel.send(msg);
        return false;
      }
      return true;
    });
  });
};
