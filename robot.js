/* global screen */
const { ipcRenderer } = require('electron')
var robot = require('robotjs')
const fs = require('fs');
const clipboard = require('electron-clipboard-extended')

window.robot = robot
var vkey = require('vkey')
const tempDirectory = require('temp-dir');
var path_ScreenInfo = tempDirectory + "\\screen_info.json"
console.log('path_screeninfo', path_ScreenInfo)
let rawdata = fs.readFileSync(path_ScreenInfo);
let screen_info = JSON.parse(rawdata);
console.log(screen_info);

module.exports = function createEvents (buf) {
  var data = JSON.parse(buf.toString());
  if (data.mouse_event > 0) {
    var screen_bounds = screen_info[data.screen_number]['Bounds'].split(',')
    var x_left = parseFloat(screen_bounds[0])
    var y_top = parseFloat(screen_bounds[1])
    var screenWidth = parseFloat(screen_bounds[2])
    var screenHeight = parseFloat(screen_bounds[3])
    var x = scale(data.clientX, 0, data.canvasWidth, 0, screenWidth) + x_left
    var y = scale(data.clientY, 0, data.canvasHeight, 0, screenHeight) + y_top
    robot.moveMouse(x, y) // move to remotes pos
    // console.log('x', x)
    // console.log('y', y)
    if (data.mouse_event == 2) {
      if (data.button == 0) {
        robot.mouseToggle('down', 'left') // set mouse position to left down
      }
      if (data.button == 2) {
        robot.mouseToggle('down', 'right') // set mouse position to right down
      }
    }
    if (data.mouse_event == 3) {
      if (data.button == 0) {
        robot.mouseToggle('up', 'left') // set mouse position to left up
      }
      if (data.button == 2) {
        robot.mouseToggle('up', 'right') // set mouse position to right up
      }
    }

    // robot.mouseClick() // click on remote click spot
  }

  if (data.keyCode) {
    var k = vkey[data.keyCode].toLowerCase()
    if (k === '<space>') k = ' '
    var modifiers = []
    if (data.shift) modifiers.push('shift')
    if (data.control) modifiers.push('control')
    if (data.alt) modifiers.push('alt')
    if (data.meta) modifiers.push('command')
    if (k[0] !== '<') {
      console.log('typed ' + k + ' ' + JSON.stringify(modifiers))
      if (modifiers[0]) robot.keyTap(k, modifiers[0])
      else robot.keyTap(k)
    } else {
      if (k === '<enter>') robot.keyTap('enter')
      else if (k === '<backspace>') robot.keyTap('backspace')
      else if (k === '<up>') robot.keyTap('up')
      else if (k === '<down>') robot.keyTap('down')
      else if (k === '<left>') robot.keyTap('left')
      else if (k === '<right>') robot.keyTap('right')
      else if (k === '<delete>') robot.keyTap('delete')
      else if (k === '<home>') robot.keyTap('home')
      else if (k === '<end>') robot.keyTap('end')
      else if (k === '<page-up>') robot.keyTap('pageup')
      else if (k === '<page-down>') robot.keyTap('pagedown')
      else console.log('did not type ' + k)
    }
  }

  if (data.event) {
    console.log('event', data.content)
    if (data.content == 'ctrl-alt-del') {
      ipcRenderer.send('ctrl-alt-del_received')
    }
  }

  if (data.clipboard_text) {
    console.log('clipboard', data.content)
    if (data.clipboard_text) {
      clipboard.writeText(data.content)
    }
  }

  if (data.folder_content_response) {
    // console.log('folder_content_response', data.files)
    ipcRenderer.send('folder_content_response', data.path, data.files)
  }

  if (data.FileUpload_response) {
    ipcRenderer.send('FileUpload_response', data.fileExisted)
  }

  if (data.FileDownload_started) {
    ipcRenderer.send('FileDownload_started', data.fileName, data.fileSize)
  }

  if (data.FileData) {
    ipcRenderer.send('filedata_received', data)
  }

}

function scale (x, fromLow, fromHigh, toLow, toHigh) {
  return (x - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow
}
