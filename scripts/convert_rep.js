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

    const plusPlus = {
      scores: [],
      reasons: [],
    };

    _.each(json.plusPlus.scores, (score, subject) => {
      plusPlus.scores.push({ subject, score });
    });

    _.each(json.plusPlus.reasons, (reasons, subject) => {
      _.each(reasons, (score, reason) => {
        plusPlus.reasons.push({
          subject,
          reason,
          score,
        });
      });
    });

    console.log(JSON.stringify(plusPlus, null, 2));
  });
}

main();
