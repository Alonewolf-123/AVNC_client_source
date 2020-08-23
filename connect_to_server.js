var clipboard = require('electron-clipboard-extended')
const { ipcRenderer, desktopCapturer } = require('electron')
var mdns = require('multicast-dns')()
var createPeerConnection = require('./peer.js')
var ui = require('./ui.js')
var connect = require('./connect.js')
var $ = require('jQuery')

var peer
var peerConnection = createPeerConnection()
window.ui = ui
window.pc = peerConnection

 peerConnection.on('connected', function connected (newPeer, remote) {
    peer = newPeer
  
    console.log('new peer connected', peer)
  
    if (!remote) {
      ipcRenderer.send('icon', 'connected')
      ui.show(ui.containers.sharing)
      ui.hide(ui.containers.content)
    } else {
      ui.show(ui.containers.multimedia)
      ui.hide(ui.containers.content)
    }
  
    peer.on('error', function error (err) {
      ipcRenderer.send('icon', 'disconnected')
      console.error('peer error')
      console.error(err)
      ui.containers.content.innerHTML = 'Error connecting! Please Quit. ' + err.message
    })
  
    peer.on('close', function close () {
      ipcRenderer.send('icon', 'disconnected')
      showChoose()
    })
  })

  ipcRenderer.on('connected', function (ev) {
      console.log('peer-connected')
      window.close()
  })

// A $( document ).ready() block.
$( document ).ready(function() {
    var interval = setInterval(query, 1000)
    query()
  
    connect.verifyUserRoom(peerConnection, ui, function (err, room, config) {
      clearInterval(interval)
      if (err) {
        ui.inputs.paste.value = 'Error! ' + err.message
        return
      }
      ui.inputs.paste.value = 'Waiting on other side...'
      ipcRenderer.send('requested_to_connect', {config: config, room: room})
    })
  
    function query () {
        console.log('query')
    }
});