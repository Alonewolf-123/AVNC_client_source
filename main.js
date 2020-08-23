const { app, ipcMain, BrowserWindow } = require('electron')
var path = require('path')
var menubar = require('menubar')
var execFile = require('child_process').execFile, child;
var filePath = require('path').join(__dirname, '..\\..\\ScreenResolutionGrabber.exe')
const url = require('url')
const fs = require('fs')

child = execFile(filePath, function(error,stdout,stderr) { 
  if (error) {
    // console.log(error.stack); 
    // console.log('Error code: '+ error.code); 
    // console.log('Signal received: '+ 
    //       error.signal);
    }
    // console.log('Child Process stdout: '+ filePath);
    //console.log('Child Process stderr: '+ stderr);
});

var win
var connect_window = null
var file_transfer_window = null
var upload_progress_window = null
var download_progress_window = null
var file_existed_window = null
var b_connected = false

function createWindow() {
  win = new BrowserWindow({
    width: 1200, 
    height: 720, 
    webPreferences: {
      nodeIntegration: true
    }
  })

  // win.setMenu(null)
  
  win.loadURL('file://' + path.join(__dirname, 'screen.html'))

  ipcMain.on('connected', function () {
    b_connected = true
    if (connect_window.webContents) connect_window.webContents.send('connected', true)
  })

  win.on('close', function () {
    win.webContents.send('peer-destroy')
    closeAllWindows()
  })
}

function closeAllWindows() {
  try {
    if (connect_window) {
      connect_window.close()
    }
    if (file_transfer_window) {
      file_transfer_window.close()
    }
    if (upload_progress_window) {
      upload_progress_window.close()
    }
    if (download_progress_window) {
      download_progress_window.close()
    }
  } catch (e) {
    console.log('close connect_window', e)
  }
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    app.quit()
})

ipcMain.on('connect_to_server', function (ev) {
  console.log('connect_to_server')
  if (!connect_window) {
    connect_window = new BrowserWindow({
      width: 720, 
      height: 280, 
      webPreferences: {
        nodeIntegration: true
      }
    })

    connect_window.setMenu(null)
    
    connect_window.loadURL('file://' + path.join(__dirname, 'connect_to_server.html'))
  }

  connect_window.on('close', function () {
    connect_window = null
  })
})

ipcMain.on('disconnect_from_server', function (ev) {
  console.log('disconnect_from_server')
  b_connected = false
  closeAllWindows()
})

ipcMain.on('error', function error (ev, err) {
  console.error(new Error(err.message))
})

ipcMain.on('requested_to_connect', function (ev, config) {
  console.log('requested_to_connect', [config])

  win.webContents.send('peer-config', config)

  ipcMain.on('show-window', function () {
    win.show()
  })

})

ipcMain.on('file_transfer_started', function (ev) {
  console.log('file_transfer_started')
  if (file_transfer_window == null && b_connected == true) {
    file_transfer_window = new BrowserWindow({
      width: 800, 
      height: 600, 
      webPreferences: {
        nodeIntegration: true
      }
    })

    // file_transfer_window.setMenu(null)

    file_transfer_window.loadURL(url.format({
        pathname: path.join(__dirname, 'file-browser.html'),
        protocol: 'file:',
        slashes: true
    }))
  
    // uncomment this line in order to open DevTools
    // file_transfer_window.webContents.openDevTools()
    file_transfer_window.on('closed', () => {
        file_transfer_window = null
    })
  }
})

ipcMain.on('ctrl-alt-del_received', function () {
  var execFile = require('child_process').execFile, child;
      var filePath = require('path').join(__dirname,'..\\..\\ServiceInstaller.exe')
      child = execFile(filePath, function callback(error, stdout, stderr){
        if (error) {
          //console.log(error.stack); 
          //console.log('Error code: '+ error.code); 
          //console.log('Signal received: '+ 
          //       error.signal);
          }
      }); 
})

ipcMain.on('folder_content_requested', function(ev, path) {
  console.log('folder_content_requested', path)
  win.webContents.send('folder_content_requested', path)
})

ipcMain.on('folder_content_response', function (ev, path, files) {
  file_transfer_window.webContents.send('folder_content_response', path, files)
})

var g_selectedFilePath = null
var g_fileSize = 0

ipcMain.on('FileUpload_requested', function (ev, selectedFilePath, fileSize) {
  g_selectedFilePath = selectedFilePath
  g_fileSize = fileSize
  console.log('FileUpload_requested', selectedFilePath, fileSize)

  if (upload_progress_window == null && b_connected == true) {
    upload_progress_window = new BrowserWindow({
      width: 600, 
      height: 300,
      webPreferences: {
        nodeIntegration: true
      },
      parent: file_transfer_window, modal: true, show: false
     })

    // upload_progress_window.setMenu(null)

    upload_progress_window.loadURL(url.format({
        pathname: path.join(__dirname, 'uploadProgressDlg.html'),
        protocol: 'file:',
        slashes: true
    }))
  
    upload_progress_window.once('ready-to-show', () => {
      upload_progress_window.hide()
    })
    // uncomment this line in order to open DevTools
    // upload_progress_window.webContents.openDevTools()
    upload_progress_window.on('closed', () => {
        upload_progress_window = null
        win.webContents.send('upload_canceled')
    })
  }

  win.webContents.send('FileUpload_requested', selectedFilePath, fileSize)
})

ipcMain.on('FileUpload_response', function (ev, fileExisted) {
  if (fileExisted == true) {
    console.log('file existed', g_selectedFilePath)
    if (file_existed_window == null && b_connected == true) {
      file_existed_window = new BrowserWindow({
        width: 600, 
        height: 150, 
        webPreferences: {
          nodeIntegration: true
        },
        parent: file_transfer_window, modal: true, show: false
      })
      // file_existed_window.setMenu(null)
      file_existed_window.loadURL(url.format({
          pathname: path.join(__dirname, 'FileReplaceDlg.html'),
          protocol: 'file:',
          slashes: true
      }))
    
      file_existed_window.once('ready-to-show', () => {
        file_existed_window.webContents.send('file_exist_quested', null, null, 2)
        file_existed_window.show()
      })

      // uncomment this line in order to open DevTools
      // file_existed_window.webContents.openDevTools()
      file_existed_window.on('closed', () => {
        file_existed_window = null
      })
    }
  } else {
    FileUpload_started(g_selectedFilePath, g_fileSize)
  }
})

function FileUpload_started(selectedFilePath, fileSize) {
  win.webContents.send('FileUpload_started', selectedFilePath, fileSize)
  if (upload_progress_window != null && b_connected == true) {
    upload_progress_window.show()
  }
}

ipcMain.on('change_progress_uploading', function(ev, bytes_sent, total_bytes) {
  if (upload_progress_window) {
    upload_progress_window.webContents.send('change_progress_uploading', bytes_sent, total_bytes)
  }
  if (bytes_sent == total_bytes) {
    try {
      if (upload_progress_window) {
        // upload_progress_window.close()
        upload_progress_window.webContents.send('change_progress_uploading', bytes_sent, total_bytes)
        upload_progress_window.webContents.send('uploading_completed')
      }
    } catch (e) {
      console.log(e)
    }
  }
})

ipcMain.on('FileUpload_ended', function (ev) {
  try {
    if (upload_progress_window) {
      upload_progress_window.close()
    }
  } catch (e) {
    console.log(e)
  }
})

ipcMain.on('ReplaceFile', function (ev, selectedFilePath, downloadFolder, downloadOrUpload) {
  if (downloadOrUpload == 1) {
    console.log('FileDownload_requested', selectedFilePath, downloadFolder)
    win.webContents.send('FileDownload_requested', selectedFilePath, downloadFolder)
  }
  if (downloadOrUpload == 2) {
    FileUpload_started(g_selectedFilePath, g_fileSize)
  }
})

ipcMain.on('FileDownload_requested', function (ev, selectedFilePath, downloadFolder) {
  downloadPath = downloadFolder + "\\" + path.basename(selectedFilePath)
  console.log('downloadPath', downloadPath)
  if (download_progress_window == null && b_connected == true) {
    download_progress_window = new BrowserWindow({
      width: 600, 
      height: 300, 
      webPreferences: {
        nodeIntegration: true
      },
      parent: file_transfer_window, modal: true, show: false
    })
    // download_progress_window.setMenu(null)
    download_progress_window.loadURL(url.format({
        pathname: path.join(__dirname, 'downloadProgressDlg.html'),
        protocol: 'file:',
        slashes: true
    }))
  
    download_progress_window.once('ready-to-show', () => {
      download_progress_window.hide()
    })

    // uncomment this line in order to open DevTools
    // download_progress_window.webContents.openDevTools()
    download_progress_window.on('closed', () => {
        download_progress_window = null
        win.webContents.send('download_canceled')
    })
  }

  if (fs.existsSync(downloadPath)) {
    console.log('file existed', downloadPath)
    if (file_existed_window == null && b_connected == true) {
      file_existed_window = new BrowserWindow({
        width: 600, 
        height: 150, 
        webPreferences: {
          nodeIntegration: true
        },
        parent: file_transfer_window, modal: true, show: false
      })
      // file_existed_window.setMenu(null)
      file_existed_window.loadURL(url.format({
          pathname: path.join(__dirname, 'FileReplaceDlg.html'),
          protocol: 'file:',
          slashes: true
      }))
    
      file_existed_window.once('ready-to-show', () => {
        file_existed_window.webContents.send('file_exist_quested', selectedFilePath, downloadFolder, 1)
        file_existed_window.show()
      })

      // uncomment this line in order to open DevTools
      // file_existed_window.webContents.openDevTools()
      file_existed_window.on('closed', () => {
        file_existed_window = null
      })
    }
  } else {
    win.webContents.send('FileDownload_requested', selectedFilePath, downloadFolder)
  }
})

ipcMain.on('FileDownload_started', function (ev, fileName, fileSize) {
  win.webContents.send('FileDownload_started', fileName, fileSize)
  if (download_progress_window != null && b_connected == true) {
    download_progress_window.show()
  }
})

ipcMain.on('filedata_received', function (ev, data) {
  win.webContents.send('filedata_received', data)
})

ipcMain.on('change_progress_downloading', function(ev, bytes_received, total_bytes) {
  if (download_progress_window) {
    download_progress_window.webContents.send('change_progress_downloading', bytes_received, total_bytes)
  }
  if (bytes_received == total_bytes) {
    try {
      if (download_progress_window) {
        // download_progress_window.close()
        download_progress_window.webContents.send('change_progress_downloading', bytes_received, total_bytes)
        download_progress_window.webContents.send('downloading_completed')
      }
    } catch (e) {
      console.log(e)
    }
  }
})

ipcMain.on('FileDownload_ended', function (ev) {
  try {
    if (download_progress_window) {
      download_progress_window.close()
    }
  } catch (e) {
    console.log(e)
  }
})