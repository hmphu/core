/**
 * Module dependencies.
 */

var fs              = require("fs"),
    fs_extra        = require("fs-extra"),
    _               = require('lodash');


exports.readManifest = ( file_path )=>{
    if( !fs.existsSync(file_path) ){
        return null;
    }
    
    return fs_extra.readJsonSync( file_path, {throws: false} );
};
/*
 * @author: dientn
 * check app is old version
 */
exports.isOldVersionApp = (idOwner, app)=>{
    var market_path = `$assets/marketplace`,
        app_path = `$assets/uploads/${idOwner}/apps`,
        market_manifest_path = `${market_path}/${app.name_identify}/manifest.json`,
        app_manifest_path = `${app_path}/${app.name_identify}/manifest.json`;
    
    if(!(fs.existsSync(market_manifest_path) && fs.existsSync(app_manifest_path))){
        return callback(null, false);
    }
    market_manifest_obj = fs_extra.readJsonSync(market_manifest_path, {throws: false});
    app_manifest_obj = fs_extra.readJsonSync(app_manifest_path, {throws: false});

    if(!market_manifest_obj && !app_manifest_obj){
        return false;
    }
    return parseFloat(market_manifest_obj.version) > parseFloat(app_manifest_obj.version)
};

exports.updateManifest = (idOwner, app_id, data, callback) =>{
    var path_manifest = `assets/uploads/${idOwner}/apps/${app_id}/manifest.json`;

    fs_extra.readJson(path_manifest, (err, manifest_obj) =>{
        if (err) {
            return callback( err );
        }
        manifest_obj = _.assign(manifest_obj, data);
        
        console.log(JSON.stringify(manifest_obj));
        fs_extra.outputJson(path_manifest, manifest_obj, function(errOutput) {
            if ( errOutput ) {
                return callback( errOutput );
            }

            // clear cache manifest.json
            delete require.cache[ path_manifest ];
            callback(null, manifest_obj );
        });
    });
};

exports.updatePrameters = (idOwner, app_id, parameters, callback) =>{
    var path_manifest = `assets/uploads/${idOwner}/apps/${app_id}/manifest.json`;

    fs_extra.readJson(path_manifest, (err, manifest_obj) =>{
        if (err) {
            return callback( err );
        }
//        manifest_obj = _.assign(manifest_obj, data);
        var keys = _.keys(parameters);
        _.forEach(keys, (key)=>{
            var index = _.findIndex(manifest_obj.parameters, ["name", key]);
            if(index != -1){
                manifest_obj.parameters[index].value = parameters[key];
            }
        });
        
        fs_extra.outputJson(path_manifest, manifest_obj, function(errOutput) {
            if ( errOutput ) {
                return callback( errOutput );
            }

            // clear cache manifest.json
            delete require.cache[ path_manifest ];
            callback(null, manifest_obj );
        });
    });
};