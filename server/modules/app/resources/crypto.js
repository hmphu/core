/**
 * Module dependencies.
 */

var crypto = require( "crypto" );
var node_cryptojs = require( "node-cryptojs-aes" );
var CryptoJS = node_cryptojs.CryptoJS;

exports.encrypt = function ( json_str, r_pass_base64 ) {
    // encrypt plain text with passphrase and custom json serialization format, return CipherParams object
    var encrypted = CryptoJS.AES.encrypt( json_str, r_pass_base64, {
        format : node_cryptojs.JsonFormatter
    } );
    // convert CipherParams object to json string for transmission
    return encrypted.toString();
};

exports.decrypt = function ( encrypted_json_str, r_pass_base64 ) {
    // decrypt data with encrypted json string, passphrase string and custom JsonFormatter
    var decrypted = CryptoJS.AES.decrypt( encrypted_json_str, r_pass_base64, {
        format : node_cryptojs.JsonFormatter
    } );

    // convert to Utf8 format unmasked data
    var decrypted_str = CryptoJS.enc.Utf8.stringify( decrypted );
    return decrypted_str;
};

exports.generateSecret = ( length ) =>{
    length = length || 128;
    // generate random passphrase binary data
    var r_pass = crypto.randomBytes( length );
    // convert passphrase to base64 format
    var r_pass_base64 = r_pass.toString( "base64" );
    return r_pass_base64;
};