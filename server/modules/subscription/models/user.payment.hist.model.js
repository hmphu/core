/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

var PaymentHistSchema = new Schema( {
    ed_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    invoice_id: String,
    coupon_id: {
        type: Schema.Types.ObjectId,
        ref: "Coupon"
    },
    ref_code: String,
    payment_method: String,
    payment_status: String,
    plan: {
        id: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            index: true
        },
        name: String,
        price: Number,
        exchange_rate: Number,
        terms: Number,
        locale: String,
        currency: String,
        features:{},
        expired_date: {
            type: Date,
            default: moment.utc()
        },
        discount_months: {
            type: Number,
            default: 0
        },
//        discount_opt_id: Schema.Types.ObjectId
    },
    max_agent_no: Number,
    price: {
        subtotal: Number, // plan price - plan discount (discount_opt_id)
        total: Number, // subtotal - discount coupon. Note: send this amount to calculate commission for referee person
        total_vn: Number, // total exchange to VND.
        grand_total: Number, // total - commission amount of payment user
        bonus: Number,
        coupon: Number
    },
    
    transaction: {}, // transaction data from payment services like onepay or smartlink
    add_time: {
        type: Number,
        index: true
    },
    upd_time: Number
}, {
    autoIndex: config.dbAutoIndex
} );

/**
 * Pre-save hook
 */
PaymentHistSchema.pre( "save", function ( next ) {
    var now = +moment.utc();
    if(this.isNew){
        this.add_time = now;
    }
    this.upd_time = now;
    next();
} );

mongoose.model( "PaymentHist", PaymentHistSchema, config.dbTablePrefix.concat( "payment_history" ) );
