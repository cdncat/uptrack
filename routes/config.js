const {$} = require('../lib/$')
const {ipcRenderer} = require('electron')

module.exports = {
    config: (cb) => {
        ipcRenderer.once('websites', (ev, data) => {
            $('config-textarea').innerHTML = data.join("\n")
            cb()
        })

        ipcRenderer.send('get-websites')
    }
}