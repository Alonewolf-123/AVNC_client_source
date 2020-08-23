var {ipcRenderer} = require('electron')
var $ = require('jQuery')

ipcRenderer.on('change_progress_uploading', function(ev, bytes_sent, total_bytes) {
    var percent = bytes_sent * 100 / total_bytes
    percent = percent.toFixed(2)
    var elem = document.getElementById("myBar");
    elem.style.width = percent + "%";
    elem.innerHTML = percent + "%";
    var sendsize = bytes_sent + "/" + total_bytes + "bytes sent"
    $('#sendsize').html(sendsize)
})

function cancel_upload() {
    window.close()
}

ipcRenderer.on('uploading_completed', function(ev) {
    console.log('upload_completed')
    $('#progressbar_caption').html("Upload Completed!")
    $('#cancel_button').html("OK")
})