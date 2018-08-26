module.exports = {
    seconds2hours: (sec) => {
        let h = ~~(sec / 3600)
        sec -= h * 3600
        let min = ~~(sec / 60)
        sec -= min * 60

        return [h, min, sec].map((x) => (x < 10 ? "0" : "") + x).join(':')
    }
}