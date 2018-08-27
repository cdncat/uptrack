const {app, ipcMain, Tray, BrowserWindow} = require('electron')
const {FILTERED_PROCESSES, DEFAULT_BLOCKED_WEBSITES, ICONS} = require('./lib/constants')
const {sessionsDb, processDb, websitesDb} = require('./lib/data')

const ps = require('current-processes')
const fs = require('fs')

let isUp = false

let blockedWebsites
let tray
let window
let lastUp
let lastDown
let sessionId = 0

sessionsDb.count({}, (err, count) => {
    sessionId = count
})

const parseWebsites = (website) => {
    return {
        website,
        deletable: true
    }
}
websitesDb.count({}, (err, count) => {
    if (count === 0) {
        let insert = DEFAULT_BLOCKED_WEBSITES.map(parseWebsites)
        insert.push({
            website: null,
            deletable: false
        })
        websitesDb.insert(insert)
        blockedWebsites = DEFAULT_BLOCKED_WEBSITES
    } else {
        websitesDb.find({deletable: true}, (err, websites) => {
            blockedWebsites = websites.map(x => x.website)
        })
    }
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

const blockWebsites = () => {
    const hosts_text = "\n" + blockedWebsites.map(x => `0.0.0.0\t${x}\n0.0.0.0\twww.${x}`).join("\n")

    unblockWebsites()

    fs.copyFileSync('/etc/hosts', '/etc/hosts.old')
    fs.appendFileSync('/etc/hosts', hosts_text)
}

const unblockWebsites = () => {
    if (fs.existsSync('/etc/hosts.old')) {
        fs.renameSync('/etc/hosts.old', '/etc/hosts')
    }
}

const startTracking = () => {
    blockWebsites()

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
    unblockWebsites()

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

ipcMain
    .on('close-app', () => {
        stopTracking()
        app.quit()
    })
    .on('toggle-track', toggleTrack)
    .on('get-stats', () => {
        sessionsDb.find({}).sort({'up': -1}).limit(10).exec((err, sessions) => {
            window.webContents.send('stats', sessions.map(session => session['down'] - session['up']).reverse())
        })
    })
    .on('update-processes', () => {
        ps.get((err, processes) => {
            processes
                .filter(x => !~FILTERED_PROCESSES.indexOf(x))
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 2)
                .map(x => x.name)
                .forEach(process => {
                    processDb.update({process}, {$inc: {active: 1}}, {upsert: true})
                })
        })
    })
    .on('get-processes', () => {
        processDb.find({}).sort({'active': -1}).limit(5).exec((err, processes) => {
            window.webContents.send('processes', processes)
        })
    })
    .on('get-websites', () => {
        window.webContents.send('websites', blockedWebsites)
    })
    .on('update-websites', (error, websites) => {
        const toDelete = blockedWebsites.filter(x => !~websites.indexOf(x))
        const toInsert = websites.filter(x => !~blockedWebsites.indexOf(x))

        if (toDelete.length !== 0) {
            toDelete.forEach(website => {
                websitesDb.remove({website})
            })
        }
        if (toInsert.length !== 0) {
            websitesDb.insert(toInsert.map(parseWebsites))
        }

        blockedWebsites = websites
    })

app
    .on('ready', () => {
        createWindow()

        tray = new Tray(ICONS.DOWN)
        tray.on('click', toggleWindow)
        tray.on('right-click', toggleWindow)

    })
    .on('window-all-closed', () => {
        stopTracking()
        app.quit()
    })
