/**
 * voip stats by caller id Schema
 * @author: vupl Created date: 25-12- 2015
 */

var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var VoipStatsCallerIdSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    caller_id: String,
    call_type: Number,
    call_accepted: {
        type:Number,
        default: 0
    },
    call_denied: {
        type: Number,
        default: 0
    },
    call_missed: {
        total: {
            type: Number,
            default: 0
        },
        no_answer: {
            type: Number,
            default: 0
        },
        user_busy: {
            type: Number,
            default: 0,
        },
        user_not_registered: {
            type: Number,
            default: 0
        },
        no_user_response: {
            type: Number,
            default: 0
        },
        normal_temporary_failure: {
            type: Number,
            default: 0
        },
        originator_cancel: {
            type: Number,
            default: 0
        },
        destination_out_of_order: {
            type: Number,
            default: 0
        }
    },
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
});

/**
 * Pre-save hook
 */
VoipStatsCallerIdSchema.pre("save", (next) =>{
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
});
mongoose.model("VoipStatsCallerId", VoipStatsCallerIdSchema, config.dbTablePrefix.concat( "voip_stats_callerid" ) );
