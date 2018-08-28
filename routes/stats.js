const {ipcRenderer} = require('electron')
const {seconds2hours} = require('../lib/helpers')
const {$} = require('../lib/$')

const canvas = $('stats-canvas')
const ctx = canvas.getContext('2d')

const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

const stats = (cb = () => null) => {
    ipcRenderer.once('stats', (ev, data, sessionsCount) => {
        clearCanvas()

        if (data.length === 0) {
            ctx.fillStyle = '#3c3c3c'
            const txt = 'No sessions recorded'
            const x = (canvas.width - ctx.measureText(txt).width) / 2
            ctx.fillText(txt, x, canvas.height / 2 + 11)
        } else {
            const height = 0.9 * canvas.height
            const max = Math.max(...data)
            const heights = data.map(x => 0.85 * height * (x / max))
            const widths = (canvas.width / data.length)
            const firstSession = Math.max(sessionsCount - 10, 1)

            ctx.strokeStyle = '#c2c2c2'
            ctx.setLineDash([])
            for (let i = 0; i < 4; ++i) {
                let y = 0.3 * height + i * 0.17 * height
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }

            ctx.font = "12px Lucida Console"
            heights.forEach((bar, i) => {
                ctx.fillStyle = '#0277BD'
                ctx.fillRect(widths * i, height - bar, (widths - 2), bar)
                ctx.fillStyle = '#3c3c3c'
                let txt = `#${firstSession + i}`
                ctx.fillText(txt, widths * i + (widths - ctx.measureText(txt).width) / 2, canvas.height)
            })

            ctx.strokeStyle = '#3c3c3c'
            ctx.beginPath()
            ctx.setLineDash([5, 10])
            ctx.moveTo(0, 0.15 * height)
            ctx.lineTo(canvas.width, 0.15 * height)
            ctx.stroke()

            ctx.font = "22px Lucida Console Bold"
            ctx.fillStyle = 'rgb(85,85,85)'
            ctx.fillText(seconds2hours(~~(max / 1000)), 0, 0.11 * height)
        }

        $('header-bars').style.display = "none"
        $('header-pie').style.display = "inline"
        cb()
    })
    ipcRenderer.send('get-stats')
}

const processes = (cb = () => null) => {
    ipcRenderer.once('processes', (ev, data) => {
        clearCanvas()

        if (data.length === 0) {
            ctx.fillStyle = '#3c3c3c'
            const txt = 'No process data recorded'
            const x = (canvas.width - ctx.measureText(txt).width) / 2
            ctx.fillText(txt, x, canvas.height / 2 + 11)
        } else {
            const total = data.map(x => x.active).reduce((a, b) => a + b, 0)
            let colors = [
                "#C62828",
                '#4527A0',
                '#F9A825',
                '#00695C',
                '#EF6C00'
            ]
            let sum = 0
            const draw = (process, i) => {
                ctx.save()
                const centerX = Math.floor(canvas.width / 4.5)
                const centerY = Math.floor(canvas.height / 2)
                const radius = Math.floor(canvas.height / 2.3)

                const startingAngle = sum
                const arcSize = (process.active / total) * 2 * Math.PI
                sum = startingAngle + arcSize

                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, startingAngle, sum, false)
                ctx.closePath()
                ctx.fillStyle = colors.pop()
                ctx.fill()

                let x = canvas.width / 7 * 4
                let y = canvas.height * 0.1 + 0.17 * canvas.height * i
                ctx.fillRect(x, y, 15, 15)

                ctx.font = "16px Lucida Console bold"
                ctx.fillStyle = '#3c3c3c'
                ctx.fillText(process.process, x + 21, y + 13)

                ctx.restore()
            }

            data.forEach(draw)
        }

        $('header-pie').style.display = "none"
        $('header-bars').style.display = "inline"
        cb()
    })
    ipcRenderer.send('get-processes')
}

module.exports = {stats, processes}