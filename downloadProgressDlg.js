var {ipcRenderer} = require('electron')
var $ = require('jQuery')

ipcRenderer.on('change_progress_downloading', function(ev, bytes_received, total_bytes) {
    var percent = bytes_received * 100 / total_bytes
    percent = percent.toFixed(2)
    var elem = document.getElementById("myBar");
    elem.style.width = percent + "%";
    elem.innerHTML = percent + "%";
    var sendsize = bytes_received + "/" + total_bytes + "bytes sent"
    $('#sendsize').html(sendsize)
})

function cancel_download() {
    window.close()
}

ipcRenderer.on('downloading_completed', function(ev) {
    console.log('download_completed')
    $('#progressbar_caption').html("Download Completed!")
    $('#cancel_button').html("OK")
})