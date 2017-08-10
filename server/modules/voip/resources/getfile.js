'use strict'
//
//  sendmail.js
//  send sys email out
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var https = require('https'),
    fs = require('fs-extra');

/**
 * handle get file record voip
 * author vupl
 */
module.exports = (idOwner, voip, cdr) => {
    if (!voip.content.record_file || !cdr.recording_file) {
        return;
    }
    
    var dir = `./assets/uploads/${idOwner}/voip`;
    var fileName = `${dir}/${voip.content.record_file}`;
    fileName = fileName.replace('.ogg', '.mp3');
    
    if (fs.existsSync(fileName)) {
        return;
    }
    
    fs.ensureDir(dir, (errDir)  => {
        if (errDir) {
            return console.log(errDir);
        }
        
        var recordingFile = cdr.recording_file;
        var file = fs.createWriteStream(fileName);
        
        try {
            https.get(recordingFile, function (response) {
                response.pipe(file);
            });
        } catch(ex) {
            file.close(); // close file
            console.error(ex);
        }
    });
};
