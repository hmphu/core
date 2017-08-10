'use strict';
//
//  file.js
//  define file js
//
//  Created by dientn on 2015-12-30.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//


/**
 * Module dependencies.
 */
var _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    fs = require('fs-extra'),
    swig = require('swig'),
    PDFKit = require('wkhtmltopdf');



var move = (src, dest)=>{
    return new Promise((resolve, reject) => {
        // if file existed
        if ( fs.existsSync(dest) ) {
            // remove then move new file to
            fs.remove(dest, (err)=>{
                if(err){
                    return reject(err);
                }
                fs.move( src, dest, ( err ) =>{
                    if(err){
                        return reject(err);
                    }
                    resolve(dest);
                });
            });
        } else {
            // file not existed, only move file to
            fs.move( src, dest, ( err ) =>{
                if(err){
                    return reject(err);
                }
                resolve(dest);
            });
        }
    });
};
/**
 * move files from the uploaded tmp folder to dest folder
 * author : dientn
 */
exports.removeFile = ( file_path , callback ) =>{
    if ( fs.existsSync(file_path) ) {
        // remove then move new file to
        fs.remove(file_path, (err)=>{
            if(err){
                return callback(err);
            }

            callback();
        });
    }else{
        callback();
    }
};
/**
 * move files from the uploaded tmp folder to dest folder
 * author : dientn
 */
exports.moveFile = (idOwner, files, dest_path) =>{
    var tasks = [],
        filePath = `${config.upload.path}${idOwner}/${dest_path || ''}`;
    fs.ensureDirSync(filePath);

    _.forEach( files, (file, key) =>{
        if(_.isArray(file)){
            _.forEach( file, (f) =>{
                var file_name = f.filename;
                var tmp_file = f.path;
                var media_file = `${filePath}/${file_name}`;
                tasks.push(move(tmp_file, media_file));
            });
        }else{
            var file_name = file.filename;
            var tmp_file = file.path;
            var media_file = `${filePath}/${file_name}`;
            tasks.push(move(tmp_file, media_file));
        }

    });

    Promise.all(tasks).then(function(values) {
        return values;
    }, function(reason) {
        console.error(reason);
        return;
    });
};

/*
 * Create file pdf
 * @author: dientn
 * @param options:
        {   path_template :path of template file (require),
            user_id : parent user id (require),
            folder_zip : folder name of folder of zip file (if zip pdf file),
            data: data to render with SWIG (require),
            file_name : file name (require),
            pdfFile : if out put by file path
            res : for streaming
        }
 * @callbaclk :
            err : if error,
            result : stream(res) if streaming(exists options.res)
                     fileinfo if file out put
 */
exports.createPDFFile = function(options, callback){
    if (!fs.existsSync(options.path_template)) {
        return callback(new TypeError("Not found template"), null);
    }
    var tpl = swig.compileFile(options.path_template);
    var userReportFolder = `${config.upload.path}${options.user_id}`;
    var html = tpl(options.data);

    var options_pdf = {
        orientation: options.orientation || "landscape", // portrait
        pageSize: options.page_size || "letter",//A4, Letter, etc.
    };
    var pdfFile = options.pdfFile? options.pdfFile: `${userReportFolder}/${options.file_name}.pdf`;

    var stream = options.res || fs.createWriteStream(pdfFile);

    stream.on('error', (err) => {
        stream.end();
        callback( err );
    });

    stream.on('finish', function() {
        callback( null, result );
    });

    PDFKit(html, options_pdf).pipe(stream);

    var result = options.res?  stream : {
        path: pdfFile,
        filename: path.basename(pdfFile)
    };


};


/**
 * move files from_path, to_path
 * author : lamtv
 * files : { filename : string }
 * onError : function called whenever error created
 */
exports.moveFilesWithPath = (files, str_path, des_path, onError, done) =>{
    var tasks = [];

    if (!files.length) {
        return done&&done();
    }

    files.forEach((file) => {
        var file_str_path = `${str_path.replace(/\/+$/,"")}/${file.name || file.filename}`,
            file_des_path = `${des_path.replace(/\/+$/,"")}/${file.newname || file.name || file.filename}`;
        tasks.push(new Promise((resolve, reject) => {

            function next(err) {
                if (err && onError) {
                    onError({
                        error : err,
                        str_path : file_str_path,
                        des_path : file_des_path
                    });
                }
                resolve();
            };

            fs.move(file_str_path, file_des_path, {overwrite: true, clobber: true}, next);
        }));
    });

    Promise.all(tasks).then(() => {
        done&&done();
    });
};


/**
 * copy files from_path, to_path
 * author : lamtv
 * files : { filename : string }
 * onError : function called whenever error created
 */
exports.copyFilesWithPath = (files, str_path, des_path, onError, done) =>{
    var tasks = [];

    if (!files.length) {
        if (done) { done(); }
        return;
    }


    files.forEach((file) => {
        var file_str_path = `${str_path.replace(/\/+$/,"")}/${file.name || file.filename}`,
            file_des_path = `${des_path.replace(/\/+$/,"")}/${file.newname || file.name || file.filename}`;
        tasks.push(new Promise((resolve, reject) => {
            fs.mkdirs(des_path, err => {
                fs.copy(file_str_path, file_des_path, { replace: true }, err => {
                    if (err && onError) {
                        onError({
                            error : err,
                            str_path : file_str_path,
                            des_path : file_des_path
                        });
                    }
                    resolve();
                });
            });
        }));
    });

    Promise.all(tasks).then(() => {
        if (done) { done(); }
    });
};
