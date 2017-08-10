'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var moment = require('moment');
var mongoose = require('mongoose');
var config = require('../config');
var Schema = mongoose.Schema;

/**
 * Ticket Schema
 */
var TicketSchema = new Schema({}, {
    strict : false
});

mongoose.model("Ticket", TicketSchema, config.dbTablePrefix.concat("ticket"));
