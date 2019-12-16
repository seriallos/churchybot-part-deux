import fs from 'fs';

import _ from 'lodash';

async function main() {
  let input = '';
  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      if (chunk) {
        input += chunk.toString('utf8');
      }
    }
  });

  process.stdin.on('end', () => {
    const json = JSON.parse(input);

    const quotes = [];

    _.each(json.oocQuotes, (userQuotes, speaker) => {
      _.each(userQuotes, quote => {
        quotes.push({
          speaker,
          quote,
        });
      });
    });

    console.log(JSON.stringify(quotes, null, 2));
  });
}

main();
