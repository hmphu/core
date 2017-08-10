'use strict';
//
//  user.calendar.controller.js
//  handle user calendar setting routes
//
//  Created by dientn on 2015-12-25.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    mongoose = require('mongoose'),
    UserCalendar = mongoose.model('UserCalendar'),
    path = require('path'),
    tmp_data = require('../../core/controllers/tmp.data.controller'),
    utils = require('../../core/resources/utils'),
    cache = require(path.resolve('./config/lib/redis.cache')),
    moment = require('moment'),
    validator = require('../validator/user.calendar.validator'),
    localController = require('./user.local.controller');


moment.updateLocale('en', {
    week : {
        dow : 1 // Monday is the first day of the week
    }
});
var isInRange = (array ,day, start, end, time_zone)=>{
    if(_.isEmpty(array)){
        return false;
    }
    for(var i = 0; i < array.length; i++){
        var bus = array[i];
        if(bus.day_of_week != day){
            continue;
        }
        var bus_start = moment.utc(bus.start_time, "HH:mm");
        var bus_end = moment.utc(bus.end_time, "HH:mm");
        
        if(bus.end_time == '00:00'){
            bus_end.endOf('days');
        }
        if(time_zone){
            bus_start = moment.utc(bus_start.utcOffset(time_zone*(-1)).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
            bus_end = moment.utc(bus_end.utcOffset(time_zone*(-1)).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
        }

        if((start.diff(bus_start, "minutes") >= 0 && end.diff(bus_end, "minutes") <= 0)
           || (start.diff(bus_start, "minutes") <= 0 && end.diff(bus_end, "minutes") >=0)
           || (bus_start.diff(start, "minutes") > 0 && bus_start.diff(end, "minutes") < 0 )
           || (bus_end.diff(start, "minutes") > 0 && bus_end.diff(end, "minutes") <0)){
            return true;
        }
    }
    return false;
};

var isInRange1 = (array ,day, start, end, time_zone)=>{
    if(_.isEmpty(array)){
        return false;
    }
    var begin = moment.utc().isoWeekday(1);// monday
    for(var i = 0; i < array.length; i++){
        
        
        var bus = array[i];
        if(begin.days() < bus.day_of_week){
            begin.add(1, 'days');
        }
        var bus_start = moment.utc(`${begin.format('DD-MM-YYYY')} ${bus.start_time}`, "DD-MM-YYYY HH:mm");
        var bus_end = moment.utc(`${begin.format('DD-MM-YYYY')} ${bus.end_time}`, "DD-MM-YYYY HH:mm");
        
        if(bus.end_time == '00:00'){
            bus_end.endOf('days');
        }
        if(time_zone){
            bus_start = moment.utc(bus_start.utcOffset(time_zone*(-1)).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
            bus_end = moment.utc(bus_end.utcOffset(time_zone*(-1)).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
        }

        if((start.diff(bus_start, "minutes") >= 0 && end.diff(bus_end, "minutes") <= 0)
           || (start.diff(bus_start, "minutes") <= 0 && end.diff(bus_end, "minutes") >=0)
           || (bus_start.diff(start, "minutes") > 0 && bus_start.diff(end, "minutes") < 0 )
           || (bus_end.diff(start, "minutes") > 0 && bus_end.diff(end, "minutes") <0)){
            return true;
        }
    }
    return false;
};

var getBusinessHours = (business_hours, time_zone) =>{
    var days = [1, 2, 3, 4, 5, 6, 7];
    var results = [];
    
    if(_.isEmpty(business_hours) ){
        return results;
    }
    
    for(var i= 0; i< business_hours.length; i++){
        var bus = business_hours[i];
        if(!bus || days.indexOf(bus.day_of_week) == -1){
            continue;
        }
        
        var start = moment.utc(bus.start_time, "HH:mm");
        var end = moment.utc(bus.end_time , "HH:mm");
        if(bus.end_time == '00:00'){
            end = end.endOf('day');
        }
        if(!start.isValid() || ! end.isValid() || (start.diff(end) == 0 && start.days() < end.days()) || start.diff(end, "minute") > 0 ){
            continue;
        }
        
        if(isInRange(results,bus.day_of_week, start, end)){
            continue;
        }
        bus.start_h = start.hours();
        bus.start_m = start.minutes();
        bus.start_second = bus.start_h * 3600 + bus.start_m * 60;
        
        bus.end_h = end.hours();
        bus.end_m = end.minutes();
        bus.end_second = bus.end_h * 3600 + bus.end_m * 60;
        
        results.push(bus);
    }
    results = _.orderBy(results, ['day_of_week', 'start_time'], ['asc', 'asc']);
    return results;
};
/**
 * add a new branding setting
 * author : dientn
 */
exports.add = (idOwner, data, next) => {
    var calendar  = new UserCalendar(data);
    calendar.ed_user_id = idOwner;

    tmp_data.save('setting_add_calendar', idOwner, calendar, calendar, (err, result) =>{
        if(err){
            return next(err);
        }
        next(null, calendar);
    });
};

/**
 * show current calendar
 * author : dientn
 */
exports.read = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    this.readInternal(idOwner, (err, calendar)=>{
        if(err){
            return next(err);
        }
        res.json(calendar);
    });
};

/**
 * show current calendar
 * author : dientn
 */
exports.readInternal = (idOwner, next) => {
    var query = {
        ed_user_id: idOwner
    };
    cache.findOneWithCache(idOwner, 'user.setting.calendar', UserCalendar, query, (err, calendar) =>{
        if(err){
            return next(err);
        }
        next(null, calendar);
    });
};

/**
 * toggle enable business hour
 * author : dientn
 */
exports.enableBusinessHour = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    if(!_.isBoolean(req.body.is_enable)){
        return next(new TypeError("user.calendar.is_enable.invalid"))
    }
    
    UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
        if(err){
            return next(err);
        }
        if(!calendar){
            return next(new TypeError('user.calendar.not_found') );
        }
        calendar.is_enable = req.body.is_enable;
        cache.saveAndUpdateCache(idOwner, 'user.setting.calendar', calendar, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json({ is_enable:calendar.is_enable });
        });
    });
};

/**
 * update the business hour by id owner
 * author : dientn
 */
exports.updateBusinessHour = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);
    UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
        if(err){
            return next(err);
        }
        if(!req.body.business_hours){
            return next(new TypeError("user.business_hours.required"));
        }
        
        localController.readInternal(idOwner, (err, local)=>{
            if(err){
                console.error(err);
            }
            calendar.time_zone = local.time_zone.value || re.user.time_zone.value;
            calendar.business_hours = getBusinessHours(req.body.business_hours);
            cache.saveAndUpdateCache(idOwner, 'user.setting.calendar', calendar, (errSave) =>{
                if(errSave){
                    return next(errSave);
                }
                res.json(calendar.business_hours);
            });
        });
        
    });
};


/**
 * edit holiday by id owner
 * author : dientn
 */
exports.editHoliday =[
    (req, res, next)=>{
        validator.validateHoliday(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var holiday= req.body;
        var holiday_id = req.params.holiday_id;
        delete holiday.__v;
        delete holiday.upd_time;
        
        UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
            if(err){
                return next(err);
            }
            
            if(!calendar){
                return next(new TypeError("user.calendar.not_found"));
            }
            
            var index = _.findIndex(calendar.holidays, (o)=>{
                return o.id && o.id == holiday_id;
            });
            
            if(index == -1){
               return next(new TypeError("user.calendar.holiday.not_found"));
            }
            
            calendar.holidays[index].name = holiday.name;
            calendar.holidays[index].start_date = +moment.utc(holiday.start_date).startOf("hour").startOf("minute").startOf("second");
            calendar.holidays[index].end_date = +moment.utc(holiday.end_date).hour(23).minute(59).second(59).millisecond(0);
            
            cache.saveAndUpdateCache(idOwner, 'user.setting.calendar', calendar, (errSave) =>{
                if(errSave){
                    return next(errSave);
                }
                res.json(_.find(calendar.holidays, (o)=>{
                    return  o.id == holiday_id;
                }));
            });
        });
    }
];

/**
 * add holiday by id owner
 * author : dientn
 */
exports.addHoliday =[
    (req, res, next)=>{
        req.body.isNew = true;
        validator.validateHoliday(req.body, next);
    },
    (req, res, next) => {
        var idOwner = utils.getParentUserId(req.user);
        var holiday= req.body;

        UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
            if(err){
                return next(err);
            }
            var day = _.findIndex(calendar.holidays, ["name", holiday.name]);
            if(day != -1 ){
                return next(new TypeError("user.calendar.holiday.exists"));
            }
            
            holiday.start_date = +moment.utc(holiday.start_date).startOf('day');
            holiday.end_date = +moment.utc(holiday.end_date).endOf('day');
            calendar.holidays.push(holiday);
            cache.saveAndUpdateCache(idOwner, 'user.setting.calendar', calendar, (errSave) =>{
                if(errSave){
                    return next(errSave);
                }
                res.json(_.find(calendar.holidays, ["name", holiday.name]));
            });
        });
    }
];

/**
 * delete holiday by id owner
 * author : dientn
 */
exports.removeHoliday = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
        if(err){
            return next(err);
        }
        calendar.holidays = calendar.holidays.filter((holiday) =>{
            return holiday._id && holiday._id.toString() !== req.params.holiday_id;
        });
        cache.saveAndUpdateCache(idOwner, 'user.setting.calendar', calendar, (errSave) =>{
            if(errSave){
                return next(errSave);
            }
            res.json("user.setting.calendar.remove_success");
        });
    });
};

/**
 * delete holiday by id owner
 * author : dientn
 */
exports.isEnabled = (req, res, next) => {
    var idOwner = utils.getParentUserId(req.user);

    UserCalendar.findOne({ed_user_id: idOwner}, (err, calendar) =>{
        if(err || !calendar){
            return next(err || new TypeError("user.setting.calendar.not_found"));
        }
        if(!calendar.is_enable){
            return next(new TypeError("user.calendar.is_disable"));
        }
        return next();
    });
};

/**
 * check time is business hour by id owner
 * author : dientn
 */
//console.log(moment.utc(1460104392634).isoWeekday(1).toISOString());
//console.log(moment().isoWeekday());
//console.log(moment(1460104392634).isValid());
//console.log(moment(1460104392634).weekday(7).days());


exports.isBusinessHour = ( idOwner, datetime , next) => {
    var date = moment.utc(datetime);
    var day = date.day() || 7;
    var query = {
        ed_user_id: idOwner,
        "business_hours.day_of_week" : day,
        is_enable: true
    };
    UserCalendar.findOne(query, {business_hours: 1, time_zone:1}, (err, calendar) =>{
        if(err){
            return next(err);
        }
        if(!calendar){
            return next(null, false);
        }
        
        var business_hours = calendar.business_hours;
        if(business_hours.length == 0){
            return next(null, false);
        }
        var start = moment.utc(date.format("HH:mm"), "HH:mm");
        var end = moment.utc(date.format("HH:mm"), "HH:mm");
        var result = isInRange1(business_hours,day, start, end, calendar.time_zone);
        next(null, result);
    });
};

//var test = (idOwner, datetime)=>{
//    var date = moment.utc(datetime);
//    var day = date.day() || 7;
//    
//    console.log("day===============",date.day() || 0);
//    console.log("day week ===============", date.weekday());
//    var query = {
//        ed_user_id: idOwner,
//        "business_hours.day_of_week" : day,
//        is_enable: true
//    };
//    console.log("query",query);
//    UserCalendar.findOne(query, {business_hours: 1,time_zone: 1}, (err, calendar) =>{
//        if(err){
//            return next(err);
//        }
//        if(!calendar){
//            console.log("nonoononon");
//            return ;
//        }
//        
//        var business_hours = calendar.business_hours;
//        if(business_hours.length == 0){
//            return next(null, false);
//        }
//        var start = moment.utc(date.format("HH:mm"), "HH:mm");
//        var end = moment.utc(date.format("HH:mm"), "HH:mm");
//        console.log("day===============",date.days() || 0);
//        console.log("start",start.format('HH:mm'));
//        console.log("time_zone1", calendar.time_zone);
////        console.log("business_hours", business_hours);
//        var result = isInRange1(business_hours,day, start, end, calendar.time_zone);
//        console.log("result", result);
//    });
//}
//test('574d08a050cbcbe31b2135a7', +moment.utc());


/**
 * check date is holiday by id owner
 * author : dientn
 */

exports.isHoliday = ( idOwner, datetime , next) => {
    var query = {
        ed_user_id: idOwner,
        is_enable: true
    };
    
    UserCalendar.findOne(query, (err, calendar) =>{
        if(err){
            return next(err);
        }
        
        if(!calendar){
            return next(null,false);
        }
        var date = moment.utc(datetime);
        date = moment.utc(date.utcOffset(calendar.time_zone).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
        date  = +date;
        
        var exists = _.find(calendar.holidays, (holiday)=>{
            return date >= holiday.start_date && date <= holiday.end_date;
        });
    
        var result = !exists ?false: true;
        return next(null,result);
    });
};

//var checkHoliday = (idOwner, datetime)=>{
//    var query = {
//        ed_user_id: idOwner,
//        is_enable: true
//    };
//    
//    UserCalendar.findOne(query, (err, calendar) =>{
//        if(err){
//            return next(err);
//        }
//        var date = moment.utc(datetime);
//        date = moment.utc(date.utcOffset(calendar.time_zone).format("DD-MM-YYYY HH:mm"), "DD-MM-YYYY HH:mm" );
//        console.log("current day", date.format("DD/MM/YYYY HH:mm"));
//        date  = +date;
//        
//        var exists = _.find(calendar.holidays, (holiday)=>{
//            console.log("start", moment.utc(holiday.start_date).format("DD/MM/YYYY HH:mm"));
//            console.log("end", moment.utc(holiday.end_date).format("DD/MM/YYYY HH:mm"));
//            return date >= holiday.start_date && date <= holiday.end_date;
//        });
//    
//        var result = !exists ?false: true;
//        console.log("result",result);
//        return result;
//    });
//};
//
//checkHoliday('574d08a050cbcbe31b2135a7', +moment.utc().add(1, "day"));
