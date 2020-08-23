var {ipcRenderer} = require('electron')
var $ = require('jQuery')

var g_selectedFilePath = null
var g_downloadFolder = null
var g_downloadOrUpload = 1

ipcRenderer.on('file_exist_quested', function(ev, selectedFilePath, downloadFolder, downloadOrUpload) {
    g_selectedFilePath = selectedFilePath
    g_downloadFolder = downloadFolder
    g_downloadOrUpload = downloadOrUpload
})

function replaceFile() {
    console.log('ReplaceFile', g_selectedFilePath, g_downloadFolder, g_downloadOrUpload)
    ipcRenderer.send('ReplaceFile', g_selectedFilePath, g_downloadFolder, g_downloadOrUpload)
    window.close()
}

function skipFile() {
    ipcRenderer.send('SkipFile')
    window.close()
}
