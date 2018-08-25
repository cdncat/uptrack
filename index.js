const {app, Menu, Tray} = require('electron')
const {path} = require('path')
const {url} = require('url')

app.on('ready', () => {
    console.log(path, url)
})
