const {app, Menu, ipcMain, Tray, BrowserWindow} = require('electron')
const {FILTERED_PROCESSES, DEFAULT_BLOCKED_WEBSITES, ICONS} = require('./lib/constants')
const {sessionsDb, processDb} = require('./lib/data')

const ps = require('current-processes')
const fs = require('fs')

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

    return {x, y}
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
    window.setVisibleOnAllWorkspaces(true)

    window.on('blur', () => {
        tray.setHighlightMode('never')
        window.hide()
    })
}

const startTracking = () => {
    const hosts_text = "\n" + DEFAULT_BLOCKED_WEBSITES.map(x => `0.0.0.0\t${x}\n0.0.0.0\twww.${x}`)

    fs.copyFileSync('/etc/hosts', '/etc/hosts.old')
    fs.appendFileSync('/etc/hosts', hosts_text).join("\n")

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
    fs.renameSync('/etc/hosts.old', '/etc/hosts')

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
        tray.setImage(ICONS.DOWN)
    } else {
        startTracking()
        tray.setImage(ICONS.UP)
    }
    isUp = !isUp
}

app.on('ready', () => {
    createWindow()

    tray = new Tray(ICONS.DOWN)
    tray.on('click', toggleWindow)
    tray.on('right-click', toggleWindow)
})

app.on('window-all-closed', () => {
    stopTracking()
    app.quit()
})

ipcMain.on('close-app', () => {
    stopTracking()
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
            .filter(x => !~FILTERED_PROCESSES.indexOf(x))
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


ipcMain.on('get-websites', () => {
    window.webContents.send('websites', DEFAULT_BLOCKED_WEBSITES)
})