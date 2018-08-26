const {ipcRenderer} = require('electron')
const {seconds2hours} = require('../lib/helpers')
const {$} = require('../lib/$')

const canvas = $('stats-canvas')
const ctx = canvas.getContext('2d')

module.exports = {
    'stats': (cb) => {
        ipcRenderer.once('stats', (ev, data) => {
            const max = Math.max(...data)
            const heights = data.map(x => 0.9 * canvas.height * (x / max))
            const widths = (canvas.width / data.length)

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            ctx.strokeStyle = 'rgb(210,210,210)'
            for (let i = 0; i < 5; ++i) {
                let y = 0.25 * canvas.height + i * 0.15 * canvas.height
                ctx.beginPath()
                ctx.setLineDash([])
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }

            ctx.fillStyle = 'rgb(47,102,144)'
            heights.forEach((bar, i) => {
                ctx.fillRect(widths * i, canvas.height - bar, (widths - 1), bar)
            })

            ctx.strokeStyle = 'rgb(47,102,144)'
            ctx.beginPath()
            ctx.setLineDash([5, 10])
            ctx.moveTo(0, 0.1 * canvas.height)
            ctx.lineTo(canvas.width, 0.1 * canvas.height)
            ctx.stroke()

            ctx.font = "16px Lucida Console bold"
            ctx.fillStyle = 'rgb(85,85,85)'
            ctx.fillText(seconds2hours(~~(max / 1000)), 0, 0.07 * canvas.height)

            cb()
        })
        ipcRenderer.send('get-stats')
    }
}