'use strict'
//
//  utils.js
//  define sys utils
//
//  Created by vupl on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

var path = require('path'),
    crypto = require( "crypto" ),
    moment = require("moment"),
    fs = require("fs"),
    swig = require('swig'),
    config = require(path.resolve('./config/config')),
    _ = require('lodash');


//  ==========
//  = PRIVATE FUNCTIONS AREA =
//  ==========

function checkHoliday(current_day, holidays){
    var day = moment(current_day).clone();
    var holiday_arr = holidays;

    for(var i =0; i < holiday_arr.length; i++){

        var start = moment.utc(holiday_arr[i].start_date);
        var end = moment.utc(holiday_arr[i].end_date);
  
        if(day.diff(start) >= 0 &&  end.diff(day) >= 0){
            end.set('hour', 0).set('minute', 0).set('second', 0);
            end.add(1, 'days');
            return end;
        }
    }
    return day;
};


//  ==========
//  = PUBLIC FUNCTIONS AREA =
//  ==========

/**
 * get parent user id
 * @author: thanhdh
 */
exports.getParentUserId = function ( user ) {
    if(!user){
        return null;
    }
    return user.ed_parent_id || user._id;
};

/**
 * find by custom conditions and return mongo cursor
 * @author: thanhdh
 */
exports.findByQuery = function(model, params){
    // check data
    params.populate = params.populate? params.populate: {};
    params.skip = Number(params.skip);
    params.limit = Number(params.limit);
    params.sort_order = Number(params.sort_order);
    params.sort = params.sort? params.sort: 'add_time';
    // sort order is desc by default
    if(params.sort_order != 1 && params.sort_order != -1 ){
        params.sort_order = -1;
    }

    // in case of only gettting total records
    if(params.is_count == true){
        return model.count(params.query);
    }

    if( !isNaN(params.skip) && params.skip > 0 ){
        if(!params.query['add_time']){
            params.query[params.sort] = {
                [params.sort_order == -1? '$lt': '$gt']: params.skip
            };
        }
    }
    var query = model.find(params.query);
    if(params.is_secondary_preferred){
        query.read('secondaryPreferred');
    }
    return query.select(params.select || "")
                .populate(params.populate.include || "", params.populate.fields || "")
                .sort({
                    [params.sort]: params.sort_order
                })
                .limit(isNaN(params.limit)? config.paging.limit: params.limit);
};

/**
* string null and return string not space
**/
exports.isEmpty = function (str){
    return _.isEmpty(_.trim(str));
};

/*
 *   get full domain url
 *   @author: dientn
 */
exports.getFullUrl = (user, is_api) =>{
    var url = `${config.izi.protocal}://${user.sub_domain}.${config.izi.domain}`;
    if(config.izi.port != 80 && config.izi.port != 443){
        url += `:${config.izi.port}`;
    } 
   //:${config.izi.port}
    return is_api? `${url}/api`: url;
};

/**
*   convert UTC to UNIX timespan
*   return milliseconds
*   @autor: khanhpq
**/
exports.convertUTCtoUNIX = function (date_utc){
    return +moment.utc(date_utc);
};


/**
*   crypto 
*   return hash string
*   @autor: dientn
**/
exports.hashString = function ( plainText, method ) {
    var returnVal = crypto.createHash( method ).update( plainText, "utf8" ).digest( "hex" );

    return returnVal;
};


/*
 * @author: dientn 
 * Returns a random integer between min and max
 */
exports.getRandomInt = function ( min, max ) {
    return Math.floor( Math.random() * ( max - min + 1 ) ) + min;
};

/*
 * @author: vupl
 *
 */
exports.getEnumKeyByValue = (data, value ) =>{
    for( var key in data ) {
        if( data.hasOwnProperty( key ) ) {
             if( data[ key ] === value )
                 return key;
        }
    }
    return '';
};

/*
 * genarate uuid for sms uid
 * @author: vupl
*/
exports.generateUUID = () =>{
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function ( c ) {
        var r = ( d + Math.random() * 16 ) % 16 | 0;
        d = Math.floor( d / 16 );
        return ( c == 'x' ? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
    } );
    return uuid;
};

/*
 * check email invalid
 *author: vupl
 */
exports.isValidEmail = (email) =>{
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// Remove all html tag from string
exports.cleanText = function ( text ) {
    return text.replace( /<\/?[^>]+(>|$)/g, "" );
};

exports.isValidObjectId = function ( id ) {
    if(id == null || id == ""){
        return false;
    }
    return  /^[0-9a-fA-F]{24}$/.test( id );
};

/*
 * sla
 * author: khanhpq
 * params:
 *      start_time: datetime(utc),
 *      target: minisecond (int),
 *      business_hours: [],
 *      holidays: [
 *         start_date: datetime(utc),
 *         end_date: datetime(utc)
 *      ]
 */
exports.processSLA = function (start_time, target, business_hours, holidays, timezone) {
    var temp = +moment();
    var time_process = 0,
        work_time_weekday = _.groupBy(business_hours, 'day_of_week'),
        current_date = moment(start_time),
        weekDay = moment(current_date).isoWeekday();
    //set time_zone 
    current_date = current_date.utcOffset(timezone);
    while (time_process <= target) {

        current_date = checkHoliday(current_date, holidays);

        weekDay = moment(current_date).isoWeekday();
        var time_a_work_day = 0;
        //Get time of a work day
        if(work_time_weekday[weekDay]){
            work_time_weekday[weekDay].forEach((item) => {
                if(item.end_second == 0){
                    return null;
                }
                if (!current_date.hours() && !current_date.minutes()) {
                    time_a_work_day += item.end_second - item.start_second;

                } else {

                    var current_date_seccond = current_date.hours() * 3600 + current_date.minutes() * 60 + current_date.seconds();
                    //Between
                    if (item.end_second >= current_date_seccond && item.start_second <= current_date_seccond) {
                        time_a_work_day += item.end_second - current_date_seccond;
                    //Great than
                    } else if (item.start_second > current_date_seccond) {
                        time_a_work_day += item.end_second - item.start_second;
                    }

                }
            });
        }

        if (time_a_work_day == 0) {
            current_date.set('hour', 0);
            current_date.set('minute', 0);
            current_date.set('second', 0);
        }

        if ((time_a_work_day + time_process) >= target) {

            var time_existence = target - time_process;

            for(var i = 0; i <  work_time_weekday[weekDay].length; i++){
                var item = work_time_weekday[weekDay][i];

                var current_date_seccond = current_date.hours() * 3600 + current_date.minutes() * 60 + current_date.seconds(),
                    cycle_time = null;

                if (item.end_second >= current_date_seccond && item.start_second <= current_date_seccond) {
                    cycle_time = (item.end_second - current_date_seccond);

                    if (time_existence <= cycle_time) {

                        time_process = time_existence;
                        current_date.add(time_existence, "seconds");
                        break;
                    } else {

                        time_process += cycle_time;
                        time_existence -= cycle_time;
                    }

                } else if (item.start_second >= current_date_seccond) {
                    cycle_time = item.end_second - item.start_second;

                    if (time_existence <= cycle_time) {

                        time_process += time_existence;
                        
                        current_date.set('hour', item.start_h);
                        current_date.set('minute', item.start_m);
                        current_date.set('second', 0);
                        current_date.add(time_existence, "seconds");
                        break;

                    } else {

                        time_existence -= cycle_time;
                        time_process += cycle_time;

                    }
                }
            }
            break;
        }else{
            time_process += time_a_work_day;
        }

        current_date = current_date.add(1, 'days');
        current_date.set('hour', 0);
        current_date.set('minute', 0);
        current_date.set('second', 0);
    }
    return +current_date;
};

exports.escapeRegExp = function (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

exports.encrypt = (text, password, algorithm) => {
    try {
        algorithm = algorithm || 'aes-256-ctr';
        var cipher = crypto.createCipher(algorithm, password);
        var crypted = cipher.update(text, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    } catch (ex) {
        console.error(ex);
        return text
    }
};
   
exports.decrypt = (text, password, algorithm) => {
    try {
        algorithm = algorithm || 'aes-256-ctr';
        var decipher = crypto.createDecipher(algorithm, password);
        var dec = decipher.update(text, 'hex', 'utf8');
        dec += decipher.final('utf8');
        return dec;
    } catch(ex) {
        console.error(ex);
        return text;
    }
};
