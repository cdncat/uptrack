const {ipcRenderer, webFrame} = require('electron')
const {$, $$, $click, $$click} = require('./lib/$')
const {seconds2hours} = require('./lib/helpers')
const {changeState, backState} = require('./routes')
const {stats, processes} = require('./routes/stats')

webFrame.setVisualZoomLevelLimits(1, 1)
webFrame.setLayoutZoomLevelLimits(0, 0)

const updateTimer = (lastUp, lastDown = +new Date(), target = 'session-time') => {
    const delta = ~~((lastDown - lastUp) / 1000)
    $(target).innerHTML = seconds2hours(delta)
}

$$click('toggle-track', () => {
    ipcRenderer.send('toggle-track')
})

$$click('go-to', (e) => {
    changeState(e.target.dataset.route)
})

$$click('go-back', backState)

$click('header-bars', stats)
$click('header-pie', processes)

let interval = 0
ipcRenderer.on('status', (ev, data) => {
    $$('session-id', $el => {
        $el.innerHTML = data.sessionId
    })

    clearInterval(interval)

    if (data.up) {
        changeState('up')

        updateTimer(data.lastUp)
        interval = setInterval(() => {
            updateTimer(data.lastUp)
            ipcRenderer.send('update-processes')
        }, 1000)
    } else {
        $('no-sessions').style.display = "none"
        $('last-session').style.display = "block"

        updateTimer(data.lastUp, data.lastDown, 'last-session-time')
        changeState('down')
    }
})