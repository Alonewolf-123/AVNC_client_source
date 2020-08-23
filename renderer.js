const path = require('path')
const util = require('util')
const fs = require('fs')
const homedir = require('os').homedir()
var {ipcRenderer} = require('electron')

const lstat = util.promisify(fs.lstat)
const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)

Vue.component('listing', {
    props: ['item'],
    template: '<div class="listing-item" @dblclick="clicked(item)"><p><i v-if="item.isFolder" class="fa fa-folder-o"></i><i v-else class="fa fa-file-o"></i>&nbsp;{{ item.name }}</p></div>',
    methods: {
        clicked(n) {
            if (n.isFolder){
                document.getElementById("file-" + app.selectedFileId).style.backgroundColor = "#f5f5f4";
                go(path.format({ dir: app.location, base: n.name }), true);
                app.selectedFile = null;
                app.selectedFileId = null;
    
            }
        }
    }
})

Vue.component('listingremote', {
    props: ['item'],
    template: '<div class="listing-item" @dblclick="clicked(item)"><p><i v-if="item.isFolder" class="fa fa-folder-o"></i><i v-else class="fa fa-file-o"></i>&nbsp;{{ item.name }}</p></div>',
    methods: {
        clicked(n) {
            if (n.isFolder){
                document.getElementById("file-remote-" + app.selectedFileRemoteId).style.backgroundColor = "#f5f5f4";
                ipcRenderer.send('folder_content_requested', app.selectedFileRemote);
                app.selectedFileRemote = null;
                app.selectedFileRemoteId = null;
            }
        }
    }
})

const app = new Vue({
    el: '#app',
    data: {
        location: homedir,
        files: [],
        tmpFiles: [],
        image: null,
        fileContent: null,
        locationRemote: homedir,
        filesRemote: [],
        tmpFilesRemote: [],
        imageRemote: null,
        fileContentRemote: null,
        selectedFile: null,
        selectedFileId: null,
        isSelectedFileFolder: true,
        selectedFileRemote: null,
        selectedFileRemoteId: null,
        isSelectedFileRemoteFolder: true
    },
    created: async function() {
        ipcRenderer.send('folder_content_requested', 'homedir')
        try {
            const files = await readdir(this.location);
            for(let i = 0; i < files.length; i++) {
                filePath = this.location + "\\" + files[i];
                try {
                    const fileStat = await lstat(filePath);
                    if (fileStat.isDirectory()) {
                        this.files.push({ id: i, name: files[i], isFolder: true })
                        this.tmpFiles.push({ id: i, name: files[i], isFolder: true })
                    } else {
                        this.files.push({ id: i, name: files[i], isFolder: false })
                        this.tmpFiles.push({ id: i, name: files[i], isFolder: false })
                    }
                } catch (e0) {
                    console.log(e0);
                }
            }
            this.files = rearrange(this.files);
        } catch (e) {
            console.log(e)
        }
    },
    methods: {
        up () {
            this.selectedFile = null;
            this.selectedFileId = null;
            go(path.dirname(this.location));
        },
        upRemote () {
            this.selectedFileRemote = null;
            this.selectedFileRemoteId = null;
            ipcRenderer.send('folder_content_requested', '..');
        },
        selected (name, id, isFolder) {
            this.selectedFile = this.location + "\\" + name;
            this.isSelectedFileFolder = isFolder
            if (this.selectedFileId == null || this.selectedFileId == id) {
                document.getElementById("file-" + id).style.backgroundColor = "#dcdcd3";
            } else {
                document.getElementById("file-" + id).style.backgroundColor = "#dcdcd3";
                document.getElementById("file-" + this.selectedFileId).style.backgroundColor = "#f5f5f4";
            } 
            this.selectedFileId = id;

        },
        selectedRemote (name, id, isFolder) {
            this.selectedFileRemote = this.locationRemote + "\\" + name;
            this.isSelectedFileRemoteFolder = isFolder
            if (this.selectedFileRemoteId == null || this.selectedFileRemoteId == id) {
                document.getElementById("file-remote-" + id).style.backgroundColor = "#dcdcd3";
            } else {
                document.getElementById("file-remote-" + id).style.backgroundColor = "#dcdcd3";
                document.getElementById("file-remote-" + this.selectedFileRemoteId).style.backgroundColor = "#f5f5f4";
            } 
            this.selectedFileRemoteId = id;
        },
        goHome () {
            go(homedir);
        },
        goHomeRemote () {
            ipcRenderer.send('folder_content_requested', 'homedir');
        },
        async refresh () {
            try {
                this.files = [];
                this.tmpFiles = [];
                const files = await readdir(this.location);
                for(let i = 0; i < files.length; i++) {
                    filePath = this.location + "\\" + files[i];
                    try {

                        const fileStat = await lstat(filePath);
                        if (fileStat.isDirectory()) {
                            this.files.push({ id: i, name: files[i], isFolder: true })
                            this.tmpFiles.push({ id: i, name: files[i], isFolder: true })
                        } else {
                            this.files.push({ id: i, name: files[i], isFolder: false })
                            this.tmpFiles.push({ id: i, name: files[i], isFolder: false })
                        }
                    } catch (e0) {
                        console.log(e0);
                    }
                }
                this.files = rearrange(this.files);
            } catch (e) {
                console.log(e)
            }
        },
        async refreshRemote () {
            ipcRenderer.send('folder_content_requested', '.')
        },
        filterCurrentFiles ({ currentTarget: { value }}) {
           if (!value) {
               this.files = this.tmpFiles
           } else {
               this.files = this.files.filter((file) => file.name.indexOf(value) > -1)
           }
        },
        UploadFile () {
            if (this.isSelectedFileFolder == false) {
                var fileLength = getFilesizeInBytes(this.selectedFile)
                if (fileLength < 3221225472) {  //if file size is smaller than 3GB
                    console.log('file name/size', this.selectedFile, fileLength)
                    ipcRenderer.send('FileUpload_requested', this.selectedFile, fileLength)
                }
            }
        },
        DownloadFile () {
            if (this.isSelectedFileRemoteFolder == false) {
                console.log('file Remote', this.selectedFileRemote)
                ipcRenderer.send('FileDownload_requested', this.selectedFileRemote, this.location)
            }
        }
    }
})

async function go(currentPath) {
    app.files = []
    app.tmpFiles = []
    
    try {
        const stat = await lstat(currentPath)

        if (stat.isDirectory()) {
            app.location = currentPath;
            
            const files = await readdir(app.location);
            
            for(let i = 0; i < files.length; i++) {
                filePath = currentPath + "\\" + files[i];
                try {
                    const fileStat = await lstat(filePath)
                    if (fileStat.isDirectory()) {
                        app.files.push({ id: i, name: files[i], isFolder: true})
                        app.tmpFiles.push({ id: i, name: files[i], isFolder: true })
                    } else {
                        app.files.push({ id: i, name: files[i], isFolder: false })
                        app.tmpFiles.push({ id: i, name: files[i], isFolder: false })
                    }
                } catch (e0) {
                    console.log(e0)
                }

            }
            app.files = rearrange(app.files);
        } else {
            app.fileContent = await readFile(currentPath, 'utf8')
        }
    } catch (e) {
        console.log(e);
    }
}

async function goRemote(currentPath, remote_files) {
    app.locationRemote = currentPath

    app.filesRemote = remote_files
    app.tmpFilesRemote = remote_files
    
    app.filesRemote = rearrange(app.filesRemote);
}

function rearrange(files) {
    rearranged = [];
    reFolders = [];
    reFiles = [];
    for(let i = 0; i < files.length; i++) {
        if (files[i].isFolder) {
            reFolders.push(files[i]);
        } else {
            reFiles.push(files[i]);
        }
    }
    rearranged = reFolders.concat(reFiles);
    return rearranged;
}

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
}

ipcRenderer.on('folder_content_response', function (ev, remote_path, remote_files) {
    console.log('folder_content_response', remote_path)
    goRemote(remote_path, remote_files)
})