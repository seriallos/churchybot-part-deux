# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ChurchyBot is a Discord bot built with discord.js v14. It uses ES modules (`"type": "module"`) throughout.

## Commands

- `npm run dev` — run locally with nodemon (auto-reloads on changes, ignores `data/`)
- `./start.sh` — production start (git pull, npm install, node index.js)

No test framework or linter is configured.

## Architecture

**Entry point:** `index.js` — initializes the Discord client, dynamically loads all modules from `modules/`, registers slash commands with the Discord REST API, and sets up event handlers.

**Module system:** Each file in `modules/` exports a default function `(client) => { ... }` that receives the Discord client and can attach event listeners. Modules optionally export slash commands in two ways:
- Single command: `export const command` (SlashCommandBuilder) + `export const execute` (handler)
- Multiple commands: `export const commands` (array of `{command, execute}`)

**Utilities:** `util.js` exports `getChurchybotCommand(message)` for parsing prefix-based commands (`churchybot <cmd>` or `@mention <cmd>`) and `DEVMODE` flag (`NODE_ENV === 'development'`).

**Data persistence:** JSON files stored in `data/` (git-ignored). Modules read/write directly to files like `data/plusplus.json`, `data/remind.json`, etc.

**External services:**
- OpenAI SDK (`openai`) for image generation and chat completions
- Google Cloud Storage for persisting generated images to `gs://churchybot/`
- Google Custom Search for `/imageme`

## Environment Variables

- `CHURCHYBOT_DISCORD_TOKEN` (required)
- `CHURCHYBOT_OPENAI_API_KEY` (for dalle/chatgpt commands)
- `CHURCHYBOT_GOOGLE_CSE_ID` / `CHURCHYBOT_GOOGLE_CSE_KEY` (for image search)
- `NODE_ENV=development` enables dev mode (shorter timeouts, test behaviors)

## Key Conventions

- All modules use ES module syntax (`import`/`export`)
- Long-running slash command handlers call `responder.deferReply()` before async work, then `responder.editReply()` with results
- Bot logs to a Discord channel named "developers-developers"
- Slash commands are registered to both a test guild (immediate updates) and globally (production)
