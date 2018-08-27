const {app} = require('electron')
const {DB_PATH} = require('./constants')

const Datastore = require('nedb')

const load_database = (path) => {
    return new Datastore({
        filename: app.getAppPath() + path,
        autoload: true
    })
}

module.exports = {
    sessionsDb: load_database(DB_PATH.SESSIONS),
    processDb: load_database(DB_PATH.PROCESSES),
    websitesDb: load_database(DB_PATH.WEBSITES)
}
