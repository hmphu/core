/**
 * voip history Schema
 * @author: vupl Created date: 25-12- 2015
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var VoipSchema = new Schema({
    ed_user_id: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: "User"
    },
    ticket_id: {
        type: Schema.Types.ObjectId,
        "default": null,
        ref: "Ticket"
    },
    call_id: {
        type: String,
        default: ''
    },
    orig_call_id: {
        type: String,
        default: ''
    },
    caller: {
        call_type: Number, // incoming or outgoing
        from: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        to: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true
        }
    },
    phone_no: {
        from: String,
        to: String
    },
    content: {
        note: String,
        duration: Number,
        record_file: String
    },
    direction : String, // local, inbound, outbound
    call_status: Number, // defined in enums
    call_tta: String, // time wait call before accept
    call_start: Date, // time call in center
    domain: String,
    provider : String,
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex,
    validateBeforeSave: false
} );

VoipSchema.index({ 'content.note': 'text'});

/**
 * Pre-save hook
 */
VoipSchema.pre( "save", function ( next ) {
    this.increment();
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );
mongoose.model( "Voip", VoipSchema, config.dbTablePrefix.concat( "voip" ) );
