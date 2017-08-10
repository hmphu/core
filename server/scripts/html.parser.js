'use strict';
//
//  Parser for html content.
//

var createTextVersion = require('textversionjs');

process.on('message', (data) => {
    var content = createTextVersion(data || '');
    process.send(content);
});
