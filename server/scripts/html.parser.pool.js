'use strict';
//
//  Thread pool implementation for html parser.
//

var generic = require('generic-pool');
var childProcess = require('child_process');

const factory = {
    create : () => {
         return new Promise((resolve, reject) => {
             var childNode = childProcess.fork('./html.parser.js', null, null);
             resolve(childNode);
        });
    },
    destroy : (client) => {
        return new Promise((resolve, reject) => {
            client.kill();
            resolve();
        });
    }
};
 
var opts = {
    max : 20, // maximum size of the pool 
    min : 2 // minimum size of the pool 
}

var pool = generic.createPool(factory, opts);

module.exports.getParser = (done) => {
    pool.acquire().then((client) => {
        done(null, client);
    }).catch((err) => {
        done(err);
    });
};
