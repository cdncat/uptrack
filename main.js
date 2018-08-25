const {app, Menu, Tray, BrowserWindow} = require('electron')
const upIcon = app.getAppPath() + '/icons/up.png'
const downIcon = app.getAppPath() + '/icons/down.png'

let isUp = false

let tray
let window

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
        width: 200,
        height: 200,
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

const toggleTrack = () => {
    if (window.isVisible()) {
        toggleWindow()
    } else {
        tray.setImage(isUp ? downIcon : upIcon)
        isUp = !isUp
    }
}

app.on('ready', () => {
    createWindow()

    tray = new Tray(downIcon)
    tray.on('click', toggleTrack)
    tray.on('double-click', toggleTrack)
    tray.on('right-click', toggleWindow)
})

app.on('window-all-closed', () => {
    app.quit()
})