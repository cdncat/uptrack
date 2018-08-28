const {ipcRenderer} = require('electron')
const {seconds2hours} = require('../lib/helpers')
const {$} = require('../lib/$')

const canvas = $('stats-canvas')
const ctx = canvas.getContext('2d')
ctx.font = "22px Lucida Console Bold"

const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

const stats = (cb = () => null) => {
    ipcRenderer.once('stats', (ev, data) => {
        clearCanvas()

        if (data.length === 0) {
            ctx.fillStyle = 'rgb(85,85,85)'
            const txt = 'No sessions recorded'
            const x = (canvas.width - ctx.measureText(txt).width) / 2
            ctx.fillText(txt, x, canvas.height / 2 + 11)
        } else {
            const max = Math.max(...data)
            const heights = data.map(x => 0.85 * canvas.height * (x / max))
            const widths = (canvas.width / data.length)

            ctx.strokeStyle = 'rgb(210,210,210)'
            for (let i = 0; i < 5; ++i) {
                let y = 0.3 * canvas.height + i * 0.17 * canvas.height
                ctx.beginPath()
                ctx.setLineDash([])
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }

            ctx.fillStyle = 'rgb(47,102,144)'
            heights.forEach((bar, i) => {
                ctx.fillRect(widths * i, canvas.height - bar, (widths - 2), bar)
            })

            ctx.strokeStyle = 'rgb(47,102,144)'
            ctx.beginPath()
            ctx.setLineDash([5, 10])
            ctx.moveTo(0, 0.15 * canvas.height)
            ctx.lineTo(canvas.width, 0.15 * canvas.height)
            ctx.stroke()

            ctx.fillStyle = 'rgb(85,85,85)'
            ctx.fillText(seconds2hours(~~(max / 1000)), 0, 0.11 * canvas.height)
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
            ctx.fillStyle = 'rgb(85,85,85)'
            const txt = 'No process data recorded'
            const x = (canvas.width - ctx.measureText(txt).width) / 2
            ctx.fillText(txt, x, canvas.height / 2 + 11)
        } else {
            const total = data.map(x => x.active).reduce((a, b) => a + b, 0)
            let colors = [
                "#B7D2FF",
                '#ECC1EC',
                '#FFF1BF',
                '#CDFFFD',
                '#C2FFCD'
            ]
            let sum = 0
            const draw = (process, i) => {
                ctx.save()
                const centerX = Math.floor(canvas.width / 4)
                const centerY = Math.floor(canvas.height / 2)
                const radius = Math.floor(canvas.height / 2)

                const startingAngle = sum
                const arcSize = (process.active / total) * 2 * Math.PI
                sum = startingAngle + arcSize

                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, startingAngle, sum, false)
                ctx.closePath()
                ctx.fillStyle = colors.pop()
                ctx.fill()

                let x = canvas.width / 5 * 3
                let y = canvas.height * 0.1 + 0.17 * canvas.height * i
                ctx.fillRect(x, y, 15, 15)

                ctx.font = "16px Lucida Console bold"
                ctx.fillStyle = 'rgb(85,85,85)'
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