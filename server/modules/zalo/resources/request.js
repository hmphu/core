'use strict'

var fs = require('fs-extra'),
    http = require('http'),
    https = require('https'),
    request = require('request'),
    qs = require('querystring');

exports.get = (url, next) => {
    request(url, (err, response, body) => {
        if (err) { return next(err); }
        next(null, {status_code: response.statusCode, body: body});
    });
}

exports.download = (url, dir, name, _options, next) => {
    var options = {
        overwrite: true
    };
    if (typeof _options == "function") {
        next = _options;
    } else {
        options = _options;
    }
    var dest = dir + "/" + name,
        tmp_name = `${dest}_tmp.${Date.now()}`;

    fs.ensureDir(dir, err => {
        if (err) {
            return next({error: err});
        }
        var file = fs.createWriteStream(tmp_name);
        var request = http.get(url, response => {
            if (response.statusCode != 200) {
                return next({status_code: response.statusCode, body: response.body});
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(err => {
                    if (err) {
                        fs.unlink(tmp_name);
                        return next(err);
                    }
                    fs.move(tmp_name, dest, {overwrite: options.overwrite, clobber: options.overwrite}, err => {
                        err&&fs.unlink(tmp_name);
                        return next(err);
                    });
                });
            });
        });

        request.on('error', err => {
            fs.unlink(tmp_name);
            return next({error: err});
        });

        file.on('error', err => {
            fs.unlink(tmp_name);
            return next({error: err});
        });
    });
}

exports.createRequest = (url, method, data, next) => {
    var post_data = JSON.stringify(data || {}) || '';

    var options = Object.assign({
        method: method || "POST",
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(post_data, "utf8")
        }
    }, getUrlOptions(url));


    var r = (options.protocol == "https:" ? https : http).request(options, handleResponse(next));

    r.on('error', next);
    r.write(post_data);
    r.end();
};

exports.createFormMultipart = (url, method, data, next) => {
    data = data || [];
    var crlf = "\r\n",
        boundary = `boundary-form-js-${Date.now()}`,
        delimiter = `${crlf}--${boundary}`,
        closeDelimiter = `${delimiter}--`;

    var processed_data = [];
    data.forEach((item, index) => {
        var cur_res = getFormData(item, {
            crlf: crlf,
            delimiter: delimiter,
            closeDelimiter: closeDelimiter
        });
        (index == data.length - 1)&&cur_res.push(new Buffer(closeDelimiter));
        cur_res.forEach(item => processed_data.push(item));
    });
    var post_data = Buffer.concat(processed_data);
    var options = Object.assign({
        method: method || "POST",
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Content-Length': post_data.length
        }
    }, getUrlOptions(url));


    var r = (options.protocol == "https:" ? https : http).request(options, handleResponse(next));

    r.on('error', next);
    r.write(post_data);
    r.end();
}

exports.createFormEncoded = (url, method, data, next) => {
    var post_data = qs.stringify(data);

    var options = Object.assign({
        method: method || "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data)
        }
    }, getUrlOptions(url));

    var r = (options.protocol == "https:" ? https : http).request(options, handleResponse(next));

    r.on('error', next);
    r.write(post_data);
    r.end();
};



var handleResponse = next => {
    return response => {
        response.setEncoding('utf-8');
        var responseString = '';

        response.on('data', data => {
            responseString += data;
        });

        response.on('end', () => {
            next(null, {
                status_code: response.statusCode,
                body: responseString
            });
        });
    }
};

var getUrlOptions = url => {
    url = (url||"").trim().toLowerCase();

    var parse_regex = /^((https?:)\/\/)?(([\w\d]+\.)+[\w\d]+)(:(\d+))?(.*)$/i,
        protocol = url.replace(parse_regex, "$2") || "http:";

    var path = url.replace(parse_regex, "$7");
    return {
        hostname: url.replace(parse_regex, "$3"),
        path: path,
        port: url.replace(parse_regex, "$6") || (protocol == "https:" ? 443 : 80),
        protocol: protocol
    };
}

var getFormData = (data, options) => {

    data.options = data.options || {};
    var first_header = `Content-Disposition: form-data; name="${data.key}"`,
        second_header = `Content-Type: ${data.options.content_type || "text/plain"}${options.crlf}`,
        value;

    if (data.options.filename) {
        first_header += `; filename=${data.options.filename}`;
        value = data.value;
    } else {
        value = new Buffer(data.value + '');
    }
    var headers = [
        options.delimiter,
        options.crlf,
        first_header,
        options.crlf,
        second_header,
        options.crlf,
    ];
    return [
        new Buffer(headers.join('')),
        value
    ];
}
