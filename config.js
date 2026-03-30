require('dotenv').config();

global.APIs = {
    lol: 'https://api.lolhuman.xyz',
    fgmods: 'https://api-fgmods.ddns.net'
};

global.APIKeys = {
    'https://api.lolhuman.xyz': process.env.LOL_KEY || 'yourkey',
    'https://api-fgmods.ddns.net': 'fg-dylux'
};

module.exports = {
    WARN_COUNT: 3,
    APIs: global.APIs,
    APIKeys: global.APIKeys
};