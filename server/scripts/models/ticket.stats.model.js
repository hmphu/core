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
 * Ticket Statistics Schema
 */
var TicketStatsSchema = new Schema({}, {
    strict : false
});

mongoose.model("TicketStats", TicketStatsSchema, config.dbTablePrefix.concat("ticket_stats"));
