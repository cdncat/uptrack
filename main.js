const {app, ipcMain, Tray, BrowserWindow, dialog} = require('electron')
const {FILTERED_PROCESSES, DEFAULT_BLOCKED_WEBSITES, ICONS} = require('./lib/constants')
const {sessionsDb, processDb, websitesDb} = require('./lib/data')
const sudo = require('sudo-prompt')
const ps = require('current-processes')
const fs = require('fs');

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
        height: 210,
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
    const command = blockedWebsites.map(x => `echo '127.0.0.1\t${x}' >> /etc/hosts; echo '127.0.0.1\twww.${x}' >> /etc/hosts`).join("; ")
    sudo.exec(
        `[ -f /etc/hosts.old ] && mv /etc/hosts.old /etc/hosts; cp /etc/hosts /etc/hosts.old; ${command}`,
        {'name': 'Uptrack'},
        (err) => {
            if (err) {
                dialog.showErrorBox('Authentication Error', 'Please try again.')
                return
            }

            lastUp = +new Date()
            sessionId++

            window.webContents.send('status', {
                'up': true,
                'lastUp': lastUp,
                'lastDown': lastDown,
                'sessionId': sessionId
            })

            tray.setImage(ICONS.UP)
            isUp = true
        }
    )
}

const stopTracking = () => {
    sudo.exec(
        '[ -f /etc/hosts.old ] && mv /etc/hosts.old /etc/hosts',
        {'name': 'Uptrack'},
        (err) => {
            if (err) {
                dialog.showErrorBox('Authentication Error', 'Please try again.')
                return
            }

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

            tray.setImage(ICONS.DOWN)
            isUp = false
        }
    )
}

const toggleTrack = () => {
    if (isUp) {
        stopTracking()
    } else {
        startTracking()
    }
}

const arrayToCsv = (docs) => {
    return docs.map(line => 
        [Date(line.up), Date(line.down), minuteSecondFormat(line.down-line.up)].join(",")).join("\n")
}

function minuteSecondFormat(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }

ipcMain
    .on('toggle-track', toggleTrack)
    .on('get-stats', () => {
        sessionsDb.find({}).sort({'up': -1}).limit(10).exec((err, sessions) => {
            const data = sessions.filter(x => x.up && x.down).map(x => x.down - x.up).reverse()
            window.webContents.send('stats', data, sessionId + 1)
        })
    })
    .on('update-processes', () => {
        ps.get((err, processes) => {
            processes
                .filter(x => !~FILTERED_PROCESSES.indexOf(x.name))
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
    .on('reset', () => {
        stopTracking()
        sessionsDb.remove({}, {multi: true})
        processDb.remove({}, {multi: true})
    })
    .on('close-app', () => {
        stopTracking()
        app.quit()
    })
    .on('download-csv', () => {
        sessionsDb.find({}, (err, docs) => {
            if (err) {
                dialog.showErrorBox("Error using find() for NeDB", err)
                throw err
            }

            let content = arrayToCsv(docs)

            dialog.showSaveDialog((filename) => {
                if(filename === undefined) {
                    dialog.showErrorBox(window, "filename was undefined")
                    return
                }
                fs.writeFile(filename, content, (err) => {
                    if(err) {
                        dialog.showErrorBox(window, "an error occured with creation of filename:" + filename)
                        return
                    }
                    dialog.showMessageBox(window, {title: "success", message: "file successfully created: " + filename})
                })
            })
        })
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
