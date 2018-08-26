const {ipcRenderer, webFrame} = require('electron')

webFrame.setVisualZoomLevelLimits(1, 1)
webFrame.setLayoutZoomLevelLimits(0, 0)

let interval = 0

const seconds2hours = (sec) => {
    let h = ~~(sec / 3600)
    sec -= h * 3600
    let min = ~~(sec / 60)
    sec -= min * 60

    return [h, min, sec].map((x) => (x < 10 ? "0" : "") + x).join(':')
}

const updateTimer = (lastUp, lastDown = +new Date(), target = 'session-time') => {
    const delta = ~~((lastDown - lastUp) / 1000)
    document.getElementById(target).innerHTML = seconds2hours(delta)
}

[...document.getElementsByClassName('toggle-track')].forEach($el => {
    $el.addEventListener('click', () => {
        ipcRenderer.send('toggle-track')
    })
})

ipcRenderer.on('status', (ev, data) => {
    [...document.getElementsByClassName('session-id')].forEach($el => {
        $el.innerHTML = data.sessionId
    })

    clearInterval(interval)

    if (data.up) {
        document.body.className = "up"
        updateTimer(data.lastUp)
        interval = setInterval(() => {
            updateTimer(data.lastUp)
        }, 1000)
    } else {
        document.getElementById('no-sessions').style.display = "none"
        document.getElementById('last-session').style.display = "block"

        updateTimer(data.lastUp, data.lastDown, 'last-session-time')
        document.body.className = "down"
    }
})