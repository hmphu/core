/**
 * voip history Schema
 * @author: vupl Created date: 25-12- 2015
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var VoipStatsSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    agent_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    call_type: Number,
    call_accepted: {
        type:Number,
        default: 0
    },
    call_denied: {
        type: Number,
        default: 0
    },
    call_unhandled: {
        type: Number,
        default: 0
    },
    total_talk_time: {
        type: Number,
        default: 0
    },
    total_wait_time: {
        type: Number,
        default: 0
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

/**
 * Pre-save hook
 */
VoipStatsSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );
mongoose.model( "VoipStats", VoipStatsSchema, config.dbTablePrefix.concat( "voip_stats" ) );
