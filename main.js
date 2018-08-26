const {app, Menu, ipcMain, Tray, BrowserWindow} = require('electron')
const Datastore = require('nedb')
const ps = require('current-processes')

const filter_processes = [
    'WindowServer',
    'Google Chrome Helper',
    'updater',
    'launchd',
    'hidd',
    'mds_stores',
    'Microsoft AutoUpdate',
    'syncdefaultsd',
    'Electron Helper'
]

const sessionsDb = new Datastore({
    filename: app.getAppPath() + '/data/sessions.db',
    autoload: true
})

const processDb = new Datastore({
    filename: app.getAppPath() + '/data/process.db',
    autoload: true
})

const upIcon = app.getAppPath() + '/icons/up.png'
const downIcon = app.getAppPath() + '/icons/down.png'

let isUp = false

let tray
let window
let lastUp
let lastDown
let sessionId = 0

sessionsDb.count({}, (err, count) => {
    sessionId = count
})

app.dock.hide()

const toggleWindow = () => {
    if (window.isVisible()) {
        tray.setHighlightMode('never')
        window.hide()
    } else {
        tray.setHighlightMode('always')
        showWindow()
    }
}

const getWindowPosition = () => {
    const windowBounds = window.getBounds()
    const trayBounds = tray.getBounds()

    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
    const y = Math.round(trayBounds.y + trayBounds.height + 4)

    return {x: x, y: y}
}

const showWindow = () => {
    const position = getWindowPosition()
    window.setPosition(position.x, position.y, false)
    window.show()
    window.focus()
}


const createWindow = () => {
    window = new BrowserWindow({
        width: 256,
        height: 215,
        show: false,
        frame: false,
        fullscreenable: false,
        resizable: false,
        webPreferences: {
            backgroundThrottling: false
        }
    })
    window.loadFile('index.html')

    window.on('blur', () => {
        tray.setHighlightMode('never')
        window.hide()
    })
}

const startTracking = () => {
    lastUp = +new Date()
    sessionId++
    window.webContents.send('status', {
        'up': true,
        'lastUp': lastUp,
        'lastDown': lastDown,
        'sessionId': sessionId
    })
}

const stopTracking = () => {
    lastDown = +new Date()
    sessionsDb.insert({
        up: lastUp,
        down: lastDown
    })
    window.webContents.send('status', {
        'up': false,
        'lastUp': lastUp,
        'lastDown': lastDown,
        'sessionId': sessionId
    })

}

const toggleTrack = () => {
    if (isUp) {
        stopTracking()
        tray.setImage(downIcon)
    } else {
        startTracking()
        tray.setImage(upIcon)
    }
    isUp = !isUp
}

app.on('ready', () => {
    createWindow()

    tray = new Tray(downIcon)
    tray.on('click', toggleWindow)
    tray.on('right-click', toggleWindow)
})

app.on('window-all-closed', () => {
    app.quit()
})

ipcMain.on('close-app', () => {
    app.quit()
})

ipcMain.on('toggle-track', toggleTrack)

ipcMain.on('get-stats', () => {
    sessionsDb.find({}).sort({'up': -1}).limit(10).exec((err, sessions) => {
        window.webContents.send('stats', sessions.map(session => session['down'] - session['up']).reverse())
    })
})

ipcMain.on('update-processes', () => {
    ps.get((err, processes) => {
        processes
            .filter(x => !~filter_processes.indexOf(x))
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map(x => x.name)
            .forEach(process => {
                processDb.update({process}, {$inc: {active: 1}}, {upsert: true})
            })
    })
})

ipcMain.on('get-processes', () => {
    processDb.find({}).sort({'active': -1}).limit(5).exec((err, processes) => {
        window.webContents.send('processes', processes)
    })
})