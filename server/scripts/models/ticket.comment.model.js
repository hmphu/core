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
 * Ticket Comment Schema
 */
var TicketCommentSchema = new Schema({}, {
    strict : false
});

mongoose.model("TicketComment", TicketCommentSchema, config.dbTablePrefix.concat("ticket_comment"));
