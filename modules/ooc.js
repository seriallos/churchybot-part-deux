import fs from 'fs';
import path from 'path';

import _ from 'lodash';

import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUOTES_DB = path.join(__dirname, '..', 'data', 'quotes.json');

const load = async () => {
  const contents = await fs.promises.readFile(QUOTES_DB);
  return JSON.parse(contents);
};

const save = async (quotes) => {
  const data = JSON.stringify(quotes);
  await fs.promises.writeFile(QUOTES_DB, data);
}

const OOC_CHANCE_PCT = 1;

export default async (client) => {
  let quotes = [];
  try {
    quotes = await load();
  } catch (error) {
    console.error('Unable to load quote DB, starting with empty quotes');
  }

  console.log(`Loaded ${quotes.length} quotes`);

  client.on('messageCreate', async (message) => {
    // ignore bot messages
    if (message.author.bot) {
      return;
    }

    if (message.content.match(/^ooc\s/)) {
      let matches;
      if (matches = message.content.match(/^ooc ([a-zA-Z0-9_]+): (.*)$/)) {
        const [, speaker, quote] = matches;
        quotes.push({
          speaker,
          quote: _.trim(quote, '"'),
        });
        await save(quotes);
        message.channel.send('Quote has been stored for future prosperity');
        console.log(`ooc: Quote stored. speaker: "${speaker}", quote: "${quote}"`);
      } else {
        message.channel.send('Invalid OOC format. Must be "ooc NAME: QUOTE"');
        console.log(`ooc: invalid ooc request`);
      }
    } else {
      const roll = 100 * _.random(0, 1, true);
      if (roll < OOC_CHANCE_PCT) {
        const quote = _.sample(quotes);
        if (quote) {
          message.channel.send(`"${_.trim(quote.quote, '"')}" - ${quote.speaker}`);
          console.log(`ooc: random quote rolled (${roll} rolled, threshold ${OOC_CHANCE_PCT})`);
        }
      }
    }
  });
}
