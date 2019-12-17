ChurchyBot Part Deux
====================

A poorly coded chat bot for Discord

Development
-----------

Need recent NodeJS

    npm install
    npm run dev

Environment Variables
---------------------

Required for operation:

    CHURCHYBOT_DISCORD_TOKEN - Discord bot token

Required for imageme module

    CHURCHYBOT_GOOGLE_CSE_ID - Google Custom Search ID
    CHURCHYBOT_GOOGLE_CSE_KEY - Google Custom Search Key

Modules
-------

Bot loads up all JS files in /modules and looks for a function that is the default export. This function expects the
client and can then sets up whatever it wants to do (listen for messages, operate on the server, etc)
