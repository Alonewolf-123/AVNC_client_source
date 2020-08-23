var {ipcRenderer} = require('electron')
var createPeerConnection = require('./peer.js')
var ui = require('./ui.js')
var connect = require('./connect.js')
var $ = require('jQuery')
var path = require('path')
const fs = require('fs')
const readChunk = require('read-chunk');

var peerConnection = createPeerConnection()
try {
  if (!peerConnection.robot) peerConnection.robot = require('./robot.js')
} catch (e) {
  error(new Error('./robot.js failed to load'))
  error(e)
}

var g_peer
var g_screen_count
var g_control_enabled = true
var g_connected = false

ipcRenderer.on('peer-config', function (ev, config) {
  console.log("config::", config)
  connect.remote(peerConnection, ui, config.config, config.room)
})

peerConnection.on('connected', function connected (peer) {
  ui.show(ui.containers.multimedia)
  ui.hide(ui.containers.content)

  g_connected = true

  $('#connect_button').html("<img class='control-icon' src='./img/disconnect.png'>")
  $('#connect_button_tooltip').html("Disconnect from the AVNC Server!")

  var screen_count = ui.containers.multimedia.childElementCount
  g_screen_count = screen_count
  var screen_number = 0
  var i;
  for (i = 0; i < screen_count; i++) {
    if (screen_number !== i) {
      ui.containers.multimedia.childNodes[i].style.display = "none"
    }
  }

  g_peer = peer

  peer.on('data', function (data) {
    // console.log('pc_robot', peerConnection)
    if (peerConnection.robot) {
      // console.log(data)
      peerConnection.robot(data)
    }
  })

  peer.on('error', function error (err) {
    Disconnected_status()
  })

  peer.on('close', function close () {
    ipcRenderer.send('disconnected', true)
    Disconnected_status()
  })

  ScreenCountReset(screen_count)
  ipcRenderer.send('connected', true)
})

function ScreenCountReset(screen_count) {
    console.log('screen_count', screen_count)
    ui.containers.screen_buttons.innerHTML = ''

    $('#all_screens').html('')
    var i;
    for (i = 0; i < screen_count; i++) {
      var button_html = "<a id='screen_" + i + "' class='screen_number-button'>Screen " + (i + 1) + "</a>"
      $('#all_screens').append(button_html)
    }

    video = ui.containers.multimedia.childNodes[0]
    videoSize = video.getBoundingClientRect()
    window.resizeTo(1200, videoSize.height + 145)
}

function Send_CtrlAltDel(){
  console.log('ctrl-alt-del sent', g_peer)
  var data = {
    event: true,
    content: "ctrl-alt-del"
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)
}

function Enable_Control() {
  console.log("g_control", g_control_enabled)
  if (g_control_enabled) {
    g_control_enabled = false
    $('#enable_control-button').html("<img class='control-icon' src='./img/start_control.png'>")
    $('#enable_control-button_tooltip').html("Start the mouse&keyboard control of the AVNC Server!")
  } else {
    g_control_enabled = true
    $('#enable_control-button').html("<img class='control-icon' src='./img/stop_control.png'>")
    $('#enable_control-button_tooltip').html("Stop the mouse&keyboard control of the AVNC Server!")
  }
}

function OpenFileTransfer(){
  ipcRenderer.send('file_transfer_started')
}

document.addEventListener('click', function (e) {
  if (e.target) {
    var button_id = e.target.id
    if (button_id.indexOf("screen_") == 0) {
      var len = button_id.length
      var screen_number = button_id.substring(7, len)
      console.log('screen_number', screen_number)
      var i;
      for (i = 0; i < g_screen_count; i++) {
        video = ui.containers.multimedia.childNodes[i]
        if (screen_number != i) {
          video.style.display = "none"
        } else {
          video.style.display = "block"
          videoSize = video.getBoundingClientRect()
          window.resizeTo(1200, videoSize.height + 80)
        }
      }
    } 
  }
})

function Disconnected_status() {
  $('#connect_button').html("<img class='control-icon' src='./img/connect.png'>")
  $('#connect_button_tooltip').html("Connect to the AVNC Server!")
  g_connected = false
  ipcRenderer.send('disconnect_from_server')
  g_peer.destroy()
  $('#remote_screens').html('')
  $('#all_screens').html("<span id='all_screens_tooltip' class='tooltiptext' style='width: 250px;'>Select a screen of the Server!</span>")
}

function Connect_Server() {
  console.log('connect clicked')

  if (g_connected == false) {
    ipcRenderer.send('connect_to_server')
  } else {
    Disconnected_status()
  }
}

var show_screens_button = false
function ShowScreens() {
  console.log('showscreens')
  if (show_screens_button) {
    $('#all_screens').addClass('dn')
    show_screens_button = false
  } else {
    $('#all_screens').removeClass('dn')
    show_screens_button = true
    console.log('false')
  }
}

ipcRenderer.on('folder_content_requested', function (ev, path) {
  var data = {
    folder_content_requested: true,
    path: path
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)
})

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  

var g_FileUploadCanceled = false;
var BytesPerChunk = 1024
async function UploadFile(fileSelectedPath, fileSize) {

  var bytes_sent = 0

  await sleep(1000);

  while (bytes_sent < fileSize) {
    if (g_FileUploadCanceled == true) {
      console.log('file_read_while stopped')
      break
    }
    var len = BytesPerChunk
    if (bytes_sent + BytesPerChunk > fileSize) {
      len = fileSize - bytes_sent
    }
    var chunk = readChunk.sync(fileSelectedPath, bytes_sent, len);
    var fileData = {
      FileData: true,
      content: chunk,
      content_length: len
    }
    bytes_sent += len
    var buf = Buffer.from(JSON.stringify(fileData));
    g_peer.send(buf)
    ipcRenderer.send('change_progress_uploading', bytes_sent, fileSize)
    console.log('chunk', chunk);
    await sleep(100);
  }
}

ipcRenderer.on('FileUpload_requested', function (ev, fileSelectedPath, fileSize) {
  fileName = path.basename(fileSelectedPath)
  var data = {
    FileUpload_requested: true,
    fileName: fileName,
    fileSize: fileSize
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)
})

ipcRenderer.on('FileUpload_started', function (ev, fileSelectedPath, fileSize) {
  fileName = path.basename(fileSelectedPath)
  var data = {
    FileUpload_started: true,
    fileName: fileName,
    fileSize: fileSize
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)

  g_FileUploadCanceled = false
  UploadFile(fileSelectedPath, fileSize)
  // ipcRenderer.send('FileUpload_ended')
  // var endData = {
  //   FileUpload_ended: true,
  // }
  // g_peer.send(endData)

})

ipcRenderer.on('upload_canceled', function (ev) {
  console.log('file upload canceled')
  g_FileUploadCanceled = true
  var data = {
    FileUpload_ended: true,
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)
})

var incomingFileName;
var incomingFileSize;
var incomingFileData;
var bytesReceived;
var downloadInProgress = false;
var fileStream
var curPath
var g_FileDownloadCanceld = false

ipcRenderer.on('FileDownload_requested', function (ev, fileSelectedPath, downloadFolder) {
  curPath = downloadFolder
  var data = {
    FileDownload_requested: true,
    path: fileSelectedPath
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)
})


ipcRenderer.on('FileDownload_started', function (ev, fileName, fileSize) {
  incomingFileName = fileName
  incomingFileSize = fileSize
  incomingFileData = []
  bytesReceived = 0
  downloadInProgress = true
  var filePath = curPath + '\\' + incomingFileName
  fileStream = fs.createWriteStream(filePath)
})

ipcRenderer.on('filedata_received', function (ev, data) {
  const buf = Buffer.from(data.content.data);
  // console.log('data.content', buf)
  fileStream.write(buf)
  bytesReceived = bytesReceived + data.content_length
  console.log('bytesreceived, imcomingFileSize', bytesReceived, incomingFileSize)
  ipcRenderer.send('change_progress_downloading', bytesReceived, incomingFileSize)
  if (bytesReceived >= incomingFileSize) {
    fileStream.end()
  }
})

ipcRenderer.on('download_canceled', function (ev) {
  var data = {
    FileDownload_ended: true,
  }
  var buf = Buffer.from(JSON.stringify(data));
  g_peer.send(buf)

  if (fileStream)
    fileStream.end()
})

ipcRenderer.on('peer-destroy', function(ev) {
  g_peer.destroy()
})