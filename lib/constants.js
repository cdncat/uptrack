const {app} = require('electron')

module.exports = {
    FILTERED_PROCESSES: [
        'WindowServer',
        'plugin-container',
        'syncdefaultsd',
        'Google Chrome Helper',
        'updater',
        'launchd',
        'hidd',
        'mds_stores',
        'Microsoft AutoUpdate',
        'syncdefaultsd',
        'Electron Helper',
        'mdworker'
    ],
    DEFAULT_BLOCKED_WEBSITES: [
        'reddit.com',
        'youtube.com',
        'soundcloud.com',
        'facebook.com',
        'twitter.com',
        'quora.com',
        '9gag.com',
        'buzzfeed.com',
        'instagram.com',
        'vine.co'
    ],
    DB_PATH: {
        SESSIONS: '/data/sessions.db',
        PROCESSES: '/data/process.db',
        WEBSITES: '/data/websites.db'
    },
    ICONS: {
        UP: app.getAppPath() + '/icons/up.png',
        DOWN: app.getAppPath() + '/icons/down.png'
    }

}