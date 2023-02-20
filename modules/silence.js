import _ from 'lodash';

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';

import { getChurchybotCommand } from '../util.js';

const DEVMODE = process.env.NODE_ENV === 'development';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// This is how long the user has to press the confirm button before it expires and deletes itself
const BUTTON_TIMEOUT = 1 * MINUTE;

// This is how long the users are timed out for and how long the "silence lock" lasts
const SILENCE_TIMEOUT = DEVMODE ? (1 * MINUTE) : (6 * HOUR);

const GENERAL_CHANNEL = 'general';

let silenceActive = false;

export const commands = [{
  // set up the slash command metadata
  command: new SlashCommandBuilder()
    .setName('silence')
    .setDescription('Silence yourself and another member. Only for emergencies. There will be consequences.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to silence')
        .setRequired(true)
     ),
  execute: async (interaction) => {

    // Only allow a single silence to be active
    if (silenceActive) {
      interaction.reply({
        content: 'A silence is already active, no more can be issued until the current one is resolved',
        ephemeral: true,
      });
      return;
    }

    const initiator = interaction.member;
    const initiatorName =  initiator.user.username;

    const target = interaction.options.getMember('target');
    const targetName = target.user.username;

    console.log(`silence: ${initiatorName} has requested to silence ${targetName}`);

    // cannot silence yourself
    if (target.id === interaction.user.id) {
      interaction.reply({
        content: 'You cannot silence yourself',
        ephemeral: true,
      });
      return;
    }

    // cannot silence a bot
    if (target.user.bot || target.user.system) {
      interaction.reply({
        content: 'You cannot silence a bot',
        ephemeral: true,
      });
      return;
    }

    // build the warning and button embed
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('silence-confirm')
          .setLabel('I Understand The Seriousness of My Action - Confirm Silence')
          .setStyle(ButtonStyle.Danger)
      );

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`Are you sure you want to silence ${targetName}?`)
      .setDescription(
        `Both you and ${targetName} will be silenced. This is a tool of last resort. Misuse will not be tolerated.`);

    // show the warning and confirmation button
    interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    // set up the collector that will act if the user confirms
    let confirmed = false;
    const filter = i => i.customId === 'silence-confirm' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: BUTTON_TIMEOUT });

    collector.on('collect', async i => {
      console.log(`silence: ${initiatorName} has confirmed silence for ${targetName}`);

      confirmed = true;
      silenceActive = true;

      // remove the button
      await i.update({ content: 'Silence has been confirmed.', components: [], embeds: [] });

      // silence initiator
      await i.member.timeout(SILENCE_TIMEOUT, 'Used /silence');

      // silence target
      await target.timeout(SILENCE_TIMEOUT, `${i.member.user.username} used /silence on you`);

      // notify the current channel
      const message = `
@everyone ${initiatorName} has silenced ${targetName} in <#${i.channel.id}>.

They are both timed out for ${_.round(SILENCE_TIMEOUT / HOUR)} hours and cannot interact on the server.

Using silence indicates something serious has gone down and we should meet up when possible to talk.
`;
      i.channel.send({
        content: message,
      });

      // notify the general/announcements/moderation channel
      const generalChannel = i.guild.channels.cache.find(c => c.name === GENERAL_CHANNEL);
      if (i.channel.id !== generalChannel.id) {
        await generalChannel.send({ content: message });
      }

      // release the active silence lock after SILENCE_TIMEOUT
      setTimeout(() => {
        silenceActive = false;
        console.log('The active silence has expired');
      }, SILENCE_TIMEOUT);
    });

    // Finally, if the user has not clicked in BUTTON_TIMEOUT, remove the button to prevent accidental clicks
    // in the future
    setTimeout(() => {
      if (!confirmed) {
        console.log('Silence confirmation has expired');
        console.log(`silence: ${initiatorName} has silence request has expired`);
        interaction.editReply({
          content: 'Silence confirmation has expired.',
          components: [],
          embeds: [],
        });
      }
    }, BUTTON_TIMEOUT);
  },
}];

export default (client) => {
};
