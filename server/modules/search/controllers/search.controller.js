'use strict';

/**
 * Module dependencies.
 */
var path = require('path');
var _ = require('lodash');
var mongoose = require('mongoose');
var moment = require('moment');
var enums = require('../resources/enums');
var utils = require(path.resolve('./modules/core/resources/utils'));
var Ticket = mongoose.model('Ticket');
var User = mongoose.model('User');
var Organization = mongoose.model('Organization');

// parse search query to tokens
function getTokens(options) {
    var query = options.query.trim();
    
    var newTokens = []; // new transformed tokens

    var tokens = query.split(/\s/g);
    
    var startQuoteFound = false;
    var startQuoteIndex = 0;
    
    for (var i in tokens) {
        var t = tokens[i];
        
        var quoteFound = t.match(/"/g) && t.match(/"/g).length === 1;
        
        var token = t.concat(' ');
        
        if (!startQuoteFound && quoteFound) {
            startQuoteFound = true;
            startQuoteIndex = newTokens.length;
            newTokens[startQuoteIndex] = token;
            continue;
        }
        
        var startQuoteToken;
        if (startQuoteFound && quoteFound) {
            startQuoteToken = newTokens[startQuoteIndex];
            startQuoteToken = startQuoteToken.concat(token);
            newTokens[startQuoteIndex] = startQuoteToken;
            startQuoteFound = false;
            continue;
        }
        
        if (startQuoteFound) {
            startQuoteToken = newTokens[startQuoteIndex];
            startQuoteToken = startQuoteToken.concat(token);
            newTokens[startQuoteIndex] = startQuoteToken;
            continue;
        }
        
        newTokens.push(token);
    }
    
    // trim tokens
    newTokens = newTokens.map(function(token) {
        return token.trim();
    });
    
    return newTokens;
}

// parse token to keyword, value and operator
function getKeywordFromToken(token) {
    var operatorRegex = />=|<=|:|>|</;
    
    var key = token;
    var value = token;
    var operator = null;
    
    if (token.match(operatorRegex)) {
        operator = token.match(operatorRegex)[0];
        var opIndex = token.indexOf(operator);
        key = token.substr(0, opIndex);
        value = token.substr(opIndex + operator.length);
    }
    
    return {
        key : key,
        value : value,
        operator : operator
    };
}

// return moment object if value is a past-time value, string otherwise.
function parsePastTimeValue(value) {
    var dateTime = value;
    
    // past hours, days, weeks, months or years
    if (value.search(/^[0-9]+(hour|hours|day|days|week|weeks|month|months|year|years)$/) !== -1) {
        var timeValues = value.match(/^[0-9]+/g);
        var timeValue = timeValues ? timeValues[0] : 0;
        
        var timeUnits = value.match(/hour|hours|day|days|week|weeks|month|months|year|years$/g);
        var timeUnit = timeUnits ? timeUnits[0] : 'hours';
        
        dateTime = moment(+moment.utc());
        dateTime = dateTime.add('-' + timeValue, timeUnit);
    }
    
    return dateTime;
}

function createSingleQuery(options) {
    var user = options.user;
    var searchEnum = options.searchEnum;
    var keyword = options.keyword;
    var key = keyword.key;
    var keywordType = keyword.keywordType;
    var value = keyword.value;
    var operator = keyword.operator;
    
    // if operator exists, change data type to regular expression instead of text
    if (operator && keywordType === 'text') {
        keyword.keywordType = 'regex';
        keywordType = keyword.keywordType;
    }
    
    if (key === 'phone') { // enable phone search as regular expression
        keyword.keywordType = 'regex';
        keywordType = keyword.keywordType;
    }
    
    if (keywordType !== 'text') { // remove quotes for none-text types
        value = value.replace(/"/g, '').trim();
    }
    
    var getTimezoneISOString = (timezone) => {
        var value = timezone * 60;
        var hours = value / 60;
        var minutes = value % 60;
        var direction = value < 0 ? '-' : '+';
        
        var hourString = hours + '';
        hourString = hourString.length === 1 ? '0'.concat(hourString) : hourString;
        hourString = direction.concat(hourString);
        
        var minuteString = minutes + '';
        minuteString = minuteString.length === 1 ? '0'.concat(minuteString) : minuteString;
        
        return hourString.concat(':').concat(minuteString);
    };
    
    switch (keywordType) {
        case 'date':
            var dateValue = parsePastTimeValue(value);
            
            var timezone = getTimezoneISOString(user.time_zone.value);
            
            var datePart;
            var timePart;
            var isoDateString;
            
            if (typeof dateValue === 'string') {
                var dateTimeParts = dateValue.split('T');
                datePart = dateTimeParts[0];
                timePart = dateTimeParts[1];
            }
            
            if (timePart) {
                isoDateString = dateValue.concat(timezone);
            } else if (datePart) {
                isoDateString = datePart.concat('T00:00:00').concat(timezone);
            }

            var fromTime = typeof dateValue === 'string' ? moment(isoDateString, moment.ISO_8601) : dateValue;

            // within a day
            if (operator === ":") {
                var toTime = moment(isoDateString, moment.ISO_8601).add(1, 'days');
                
                keyword.condition = {
                    $gte : fromTime.toDate().getTime(),
                    $lt : toTime.toDate().getTime()
                };
            }
            
            // date less than
            if (operator === '<') {
                keyword.condition = {
                    $lt : fromTime.toDate().getTime()
                };
            }
            
            // date less than or equal
            if (operator === '<=') {
                if (timePart || typeof dateValue !== 'string') {
                    keyword.condition = {
                        $lte : fromTime.toDate().getTime()
                    };
                } else if (datePart) {
                    fromTime = fromTime.add(1, 'days');
                    
                    keyword.condition = {
                        $lt : fromTime.toDate().getTime()
                    };
                }
            }
            
            // date greater than
            if (operator === '>') {
                if (timePart || typeof dateValue !== 'string' ) {
                    keyword.condition = {
                        $gt : fromTime.toDate().getTime()
                    };
                } else if (datePart) {
                    fromTime = fromTime.add(1, 'days');
                    
                    keyword.condition = {
                        $gte : fromTime.toDate().getTime()
                    };
                }
            }
            
            // date greater than or equal
            if (operator === '>=') {
                keyword.condition = {
                    $gte : fromTime.toDate().getTime()
                };
            }
            
            break;
        case 'regex':
            var regex = new RegExp(escapeRegExp(value));
            keyword.condition = {
                $regex : regex,
                $options : 'i'
            };
            
            break;
        case 'id':
        case 'array':
        case 'text':
        case 'sort':
            keyword.condition = value;
            
            break;
        case 'enum':
            var num = !searchEnum[key] || typeof searchEnum[key][value] === 'undefined' ? value : searchEnum[key][value];
            
            if (operator === ":") {
                keyword.condition = num;
            }
            
            // number less than
            if (operator === '<') {
                keyword.condition = {
                    $lt : num
                };
            }
            
            // number less than or equal
            if (operator === '<=') {
                keyword.condition = {
                    $lte : num
                };
            }
            
            // number greater than
            if (operator === '>') {
                keyword.condition = {
                    $gt : num
                };
            }
            
            // number greater than or equal
            if (operator === '>=') {
                keyword.condition = {
                    $gte : num
                };
            }
            
            break;
        default:
            break;
    }
    
    return keyword;
}

// { key : status, value : 'new', operator : ':'}
function createCondition(options) {
    var keyword = options.keyword;
    var operator = keyword.operator;
    
    var dateKeywords = ['created', 'updated', 'solved', 'commented', 'due_date'];
    var objIdKeywords = ['id', 'assignee', 'requester', 'submitter', 'commenter', 'group', 'organization'];
    var arrayKeywords = ['tags', 'roles', 'cc', 'via'];
    var enumKeywords = ['status', 'type', 'priority', 'satisfaction'];
    var sortKeywords = ['sort'];
    
    var keywordType = 'text';

    if (operator) {
        var key = keyword.key;

        if (dateKeywords.indexOf(key) > -1) {
            keywordType = 'date'; 
        } else if (objIdKeywords.indexOf(key) > -1) {
            keywordType = 'id'; 
        } else if (enumKeywords.indexOf(key) > -1) {
            keywordType = 'enum'; 
        }  else if (arrayKeywords.indexOf(key) > -1) {
            keywordType = 'array'; 
        } else if (sortKeywords.indexOf(key) > -1) {
            keywordType = 'sort';
        }
    }
    
    keyword.keywordType = keywordType; // define keyword data type
        
    return createSingleQuery(options);
}

function findTickets(query) {
//    console.log(JSON.stringify(query));
    return new Promise((resolve, reject) => {
        var enabledLookups = {}; // determine if lookup stage should be included or not
        enabledLookups[enums.RefCollection.TICKET_COMMENT] = false;
        enabledLookups[enums.RefCollection.TICKET_STATS] = false;
        
        var user = query.user;
        var textSearch = query.textSearch;
        var sortSearch = query.sortSearch;
        var andSearch = query.andSearch;
        var skip = query.skip;
        var limit = query.limit;
        var count = query.count;
        
        if (andSearch.$and.length === 0 && textSearch.$text.$search.length === 0) { // ignore search on empty query
            return resolve({
                results : [],
                skip : skip,
                limit : limit,
                count : count
            });
        }
        
        var project = { // ticket fields
            fields : 1,
            sla : 1,
            type : 1,
            priority : 1,
            tags : 1,
            status : 1,
            subject : 1,
            group_id : 1,
            agent_id : 1,
            requester_id : 1,
            submitter_id : 1,
            add_time : 1,
            upd_time : 1,
            comment_time : 1,
            deadline : 1,
            provider : 1,
            provider_data : 1,
            organization : 1
        };
        
        // ticket
        var ticketUserLookup = [{
            $lookup : {
                from : enums.RefCollection.USER,
                localField : 'agent_id',
                foreignField : '_id',
                as : 'agent'
            }
        }, {
            $lookup : {
                from : enums.RefCollection.USER,
                localField : 'requester_id',
                foreignField : '_id',
                as : 'requester'
             }
        }, {
            $lookup : {
                from : enums.RefCollection.USER,
                localField : 'submitter_id',
                foreignField : '_id',
                as : 'submitter'
             }
        }];
        
        var ticketGroupLookup = [{
            $lookup : {
                from : enums.RefCollection.GROUP,
                localField : 'group_id',
                foreignField : '_id',
                as : 'group'
            }
        }];
        
        var ticketOrganizationLookup = [{
            $lookup : {
                from : enums.RefCollection.ORGANIZATION,
                localField : 'organization',
                foreignField : '_id',
                as : 'organizations'
            }
        }];
        
        var ticketStatsLookup = [{
            $lookup : {
                from : enums.RefCollection.TICKET_STATS,
                localField : '_id',
                foreignField : 'ticket_id',
                as : 'stats'
            }
        }];
        
        var ticketCommentLookup = [{
            $lookup : {
                from : enums.RefCollection.TICKET_COMMENT,
                localField : '_id',
                foreignField : 'ticket_id',
                as : 'comments'
            }
        }];
        
        var firstMatchStage = {
            $and : []
        };
        
        var secondMatchStage = {
            $and : []
        };
        
        // transform user-friendly keywords to actual keywords
        andSearch.$and.forEach((and) => {
            var $or = and.$or || and.$and;
            
            var firstMatch = true;
            
            $or.forEach((or) => {
                if (or.id) {
                    var id = or.id;
                    delete or.id;
                    or._id = castToObjectId(id);
                } else if (or.assignee) {
                    var assignee = or.assignee;
                    delete or.assignee;
                    
                    if (assignee === 'none') {
                        or.agent_id = null;
                    } else if (assignee === 'me') {
                        or.agent_id = castToObjectId(user._id);
                    } else {
                        or.agent_id = castToObjectId(assignee);
                    }
                } else if (or.requester) {
                    var requester = or.requester;
                    delete or.requester;
                    
                    if (requester === 'none') {
                        or.requester_id = null;
                    } else if (requester === 'me') {
                        or.requester_id = castToObjectId(user._id);
                    } else {
                        or.requester_id = castToObjectId(requester);
                    }
                } else if (or.submitter) {
                    var submitter = or.submitter;
                    delete or.submitter;
                    
                    if (submitter === 'none') {
                        or.submitter_id = null;
                    } else if (submitter === 'me') {
                        or.submitter_id = castToObjectId(user._id);
                    } else {
                        or.submitter_id = castToObjectId(submitter);
                    }
                } else if (or.commenter) {
                    var commenter = or.commenter;
                    delete or.commenter;
                    or['comments.user_id'] = castToObjectId(commenter);
                } else if (or.organization) {
                    var organization = or.organization;
                    delete or.organization;
                    
                    if (organization === 'none') {
                        or.organization = null;
                    }
                    else {
                        or.organization = castToObjectId(organization);
                    }
                } else if (or.group) {
                    var group = or.group;
                    delete or.group;

                    if (group === 'none') {
                        or.group_id = null;
                    } else {
                        or.group_id = castToObjectId(group);
                    }
                } else if (or.priority) {
                    var priority = or.priority;

                    if (priority === 'none') {
                        or.priority = null;
                    }
                } else if (or.cc) {
                    var cc = or.cc;
                    delete or.cc;
                    or['cc_agents'] = cc;
                } else if (or.via) {
                    var via = or.via;
                    delete or.via;
                    or.provider = via;
                } else if (or.created) {
                    var created = or.created;
                    delete or.created;
                    or.add_time = created;
                } else if (or.updated) {
                    var updated = or.updated;
                    delete or.updated;
                    or.upd_time = updated;
                } else if (or.commented) {
                    var commented = or.commented;
                    delete or.commented;
                    or.comment_time = commented;
                } else if (or.due_date) {
                    var dueDate = or.due_date;
                    delete or.due_date;
                    or.deadline = dueDate;
                } else if (or.solved) {
                    firstMatch = false;
                    enabledLookups[enums.RefCollection.TICKET_STATS] = true;
                    var solved = or.solved;
                    delete or.solved;
                    or['stats.date.status.Solved'] = solved;
                } else if (typeof or.satisfaction !== 'undefined') {
                    firstMatch = false;
                    enabledLookups[enums.RefCollection.TICKET_STATS] = true;
                    var satisfaction = or.satisfaction;
                    delete or.satisfaction;
                    or['stats.rating.value'] = satisfaction;
                } else if (or.comment) {
                    firstMatch = false;
                    enabledLookups[enums.RefCollection.TICKET_COMMENT] = true;
                    var comment = or.comment;
                    delete or.comment;
                    or['comments.content'] = comment;
                } else if (or.description) {
                    firstMatch = false;
                    enabledLookups[enums.RefCollection.TICKET_COMMENT] = true;
                    var description = or.description;
                    delete or.description;
                    or.comments = {};
                    or.comments.$elemMatch = {
                        content : description,
                        is_first : true
                    };
                }
                
                // custom field search
                Object.keys(or).forEach((fieldKey) => {
                    if( fieldKey.indexOf(enums.Settings.FIELD_KEY_PREFIX) === 0) {
                        var fieldValue = or[fieldKey];
                        delete or[fieldKey];
                        
                        var csField = 'fields.'.concat(fieldKey.replace(enums.Settings.FIELD_KEY_PREFIX, ''));
                        or[csField] = fieldValue;
                    }
                });
            });
            
            if (firstMatch) {
                firstMatchStage.$and.push(and);
            } else {
                secondMatchStage.$and.push(and);
            }
        });
        
        // transform user-friendly sort keywords to actual sort keywords
        var sortStage = {
            $sort : {
                add_time : 1
            }
        };
        
        Object.keys(sortSearch.$sort).forEach((sortKey) => {
            var sort = sortSearch.$sort[sortKey];

            if (sortKey === 'created') {
                sortStage.$sort.add_time = sort;
            }
        });
     
        // search
        var ticketMatch = { // initial match
            ed_user_id : castToObjectId(utils.getParentUserId(user)),
            is_delete : false
        };
        
        if (firstMatchStage.$and.length > 0) {
            _.extend(ticketMatch, firstMatchStage);
        }
            
        if (textSearch.$text.$search.length > 0) { // if text search exists
            ticketMatch.$text = textSearch.$text;
        }
        
        var ticketStages = [];
        ticketStages = ticketStages.concat([{
            $match : ticketMatch
        }, {
            $project : project
        }]);
        
        if (enabledLookups[enums.RefCollection.TICKET_COMMENT]) {
            ticketStages = ticketStages.concat(ticketCommentLookup);
            
            _.extend(project, {
                'comments.content' : 1,
                'comments.is_first' : 1,
                'comments.user_id' : 1
            });
        }
        
        if (enabledLookups[enums.RefCollection.TICKET_STATS]) {
            ticketStages = ticketStages.concat(ticketStatsLookup);
            
            _.extend(project, {
                'stats.date' : 1,
                'stats.rating.value' : 1
            });
        }
        
        if (secondMatchStage.$and.length > 0) {
            ticketStages = ticketStages.concat([{
                $match : secondMatchStage
            }]);
        }
        
        var params = {
            skip : skip,
            limit : limit,
            count : count
        };
        
        // count only
        if (count) {
            var countTask = new Promise((rsolve, rject) => {
                find(Ticket, ticketStages, params, rsolve, rject);
            });
            
            countTask.then((countData) => {
                resolve(countData);
            }).catch((err) => {
                reject(err);
            });
            
            return;
        }
        
        // continue search
        ticketStages = ticketStages.concat(ticketUserLookup).concat(ticketGroupLookup).concat(ticketOrganizationLookup);
        
        // finally filter only necessary fields
        ticketStages = ticketStages.concat([{
            $project : {
                subject : 1,
                status : 1,
                sla : 1,
                upd_time : 1,
                add_time : 1,
                'agent._id' : 1,
                'agent.name' : 1,
                'requester._id' : 1,
                'requester.name' : 1,
                'submitter._id' : 1,
                'submitter.name' : 1,
                'group._id' : 1,
                'group.name' : 1
            }
        }, {
            $project : {
                subject : 1,
                status : 1,
                sla : 1,
                requester : {
                    $arrayElemAt : ['$requester', 0]
                },
                agent : {
                    $arrayElemAt : ['$agent', 0]
                },
                submitter : {
                    $arrayElemAt : ['$submitter', 0]
                },
                group : {
                    $arrayElemAt : ['$group', 0]
                },
                upd_time : 1,
                add_time : 1
            }
        }, sortStage]);
        
        var findTask = new Promise((rsolve, rject) => {
            find(Ticket, ticketStages, params, rsolve, rject);
        });
        
        findTask.then((findData) => {
            resolve(findData);
        }).catch((err) => {
            reject(err);
        });
    });
}

function findAgents(query) {
//  console.log(JSON.stringify(query));
  return new Promise((resolve, reject) => {
  
      var user = query.user;
      var textSearch = query.textSearch;
      var andSearch = query.andSearch;
      var skip = query.skip;
      var limit = query.limit;
      var count = query.count;
      
      if (andSearch.$and.length === 0 && textSearch.$text.$search.length === 0) { // ignore search on empty query
          return resolve({
              results : [],
              skip : skip,
              limit : limit,
              count : count
          });
      }
      
      var project = { // agent fields
          name : 1,
          email : 1,
          roles : 1,
          profile_image : 1,
          tags : 1,
          add_time : 1,
          upd_time : 1
      };
      
      var groupUserLookup = [{
          $lookup : {
              from : enums.RefCollection.GROUP_USER,
              localField : '_id',
              foreignField : 'user_id',
              as : 'groups'
          }
      }];
      
      var contactUserLookup = [{
          $lookup : {
              from : enums.RefCollection.CONTACT_USER,
              localField : '_id',
              foreignField : 'user_id',
              as : 'contacts'
          }
      }];
      
      var agentMatch = { // initial match
          $or : [{
              ed_parent_id : castToObjectId(utils.getParentUserId(user))
          }, {
              _id : castToObjectId(utils.getParentUserId(user))
          }],
//          is_suspended : false,
          is_requester : false
      };
      
      if (textSearch.$text.$search.length > 0) { // if text search exists
          agentMatch.$text = textSearch.$text;
      }
      
      var agentStages = [];
      agentStages = agentStages.concat([{
          $match : agentMatch
      }, {
          $project : project
      }]).concat(groupUserLookup).concat(contactUserLookup);
      
      // transform user-friendly keywords to actual keywords
      andSearch.$and.forEach((and) => {
          var $or = and.$or;
          
          $or.forEach((or) => {
              if (or.id) {
                  var id = or.id;
                  delete or.id;
                  or._id = castToObjectId(id);
              } else if (or.group) {
                  var group = or.group;
                  delete or.group;

                  if (group === 'none') {
                      or.group = { $size : 0 };
                  } else {
                      or['groups.group_id'] = castToObjectId(group);
                  }
              } else if (or.created) {
                  var created = or.created;
                  delete or.created;
                  or.add_time = created;
              } else if (or.updated) {
                  var updated = or.updated;
                  delete or.updated;
                  or.upd_time = updated;
              } else if (or.phone) {
                  var phone = or.phone;
                  delete or.phone;
                  or.contacts = {};
                  or.contacts.$elemMatch = {
                      value : phone,
                      type : enums.UserContactType.phone
                  };
              } else if (or.email) {
                  var email = or.email;
                  delete or.email;
                  or.contacts = {};
                  or.contacts.$elemMatch = {
                      value : email,
                      type : enums.UserContactType.email
                  };
              }
          });
      });
      
      if (andSearch.$and.length > 0) {
          agentStages = agentStages.concat([{
              $match : andSearch
          }]);
      }
      
      var params = {
          skip : skip,
          limit : limit,
          count : count
      };
      
      // count only
      if (count) {
          var countTask = new Promise((rsolve, rject) => {
              find(User, agentStages, params, rsolve, rject);
          });
          
          countTask.then((countData) => {
              resolve(countData);
          }).catch((err) => {
              reject(err);
          });
          
          return;
      }
      
      // always sort
      var sortStage = {
          $sort : {
              add_time : 1
          }
      };
      
      // filter only necessary fields
      agentStages = agentStages.concat([{
          $project : {
              name : 1,
              email : 1,
              roles : 1,
              upd_time : 1,
              add_time : 1,
              profile_image : 1
          }
      }, sortStage]);
      
      var findTask = new Promise((rsolve, rject) => {
          find(User, agentStages, params, rsolve, rject);
      });
      
      findTask.then((findData) => {
          resolve(findData);
      }).catch((err) => {
          reject(err);
      });
  });
}

function findRequesters(query) {
//  console.log(JSON.stringify(query));
  return new Promise((resolve, reject) => {
  
      var user = query.user;
      var textSearch = query.textSearch;
      var andSearch = query.andSearch;
      var skip = query.skip;
      var limit = query.limit;
      var count = query.count;
      
      if (andSearch.$and.length === 0 && textSearch.$text.$search.length === 0) { // ignore search on empty query
          return resolve({
              results : [],
              skip : skip,
              limit : limit,
              count : count
          });
      }
      
      var project = { // requester fields
          name : 1,
          email : 1,
          org_id : 1,
          profile_image : 1,
          tags : 1,
          add_time : 1,
          upd_time : 1
      };
      
      var organizationUserLookup = [{
          $lookup : {
              from : enums.RefCollection.ORGANIZATION,
              localField : 'org_id',
              foreignField : '_id',
              as : 'organizations'
          }
      }];
      
      var contactUserLookup = [{
          $lookup : {
              from : enums.RefCollection.CONTACT_USER,
              localField : '_id',
              foreignField : 'user_id',
              as : 'contacts'
          }
      }];
      
      var requesterMatch = { // initial match
          ed_parent_id : castToObjectId(utils.getParentUserId(user)),
//          is_suspended : false,
          is_requester : true
      };
      
      if (textSearch.$text.$search.length > 0) { // if text search exists
          requesterMatch.$text = textSearch.$text;
      }
      
      var requesterStages = [];
      requesterStages = requesterStages.concat([{
          $match : requesterMatch
      }, {
          $project : project
      }]).concat(organizationUserLookup).concat(contactUserLookup);
      
      // transform user-friendly keywords to actual keywords
      andSearch.$and.forEach((and) => {
          var $or = and.$or;
          
          $or.forEach((or) => {
              if (or.id) {
                  var id = or.id;
                  delete or.id;
                  or._id = castToObjectId(id);
              } else if (or.organization) {
                  var organization = or.organization;
                  delete or.organization;
                  
                  if (organization === 'none') {
                      or.organizations = { $size : 0 };
                  }
                  else {
                      or['organizations._id'] = castToObjectId(organization);
                  }
              } else if (or.created) {
                  var created = or.created;
                  delete or.created;
                  or.add_time = created;
              } else if (or.updated) {
                  var updated = or.updated;
                  delete or.updated;
                  or.upd_time = updated;
              } else if (or.phone) {
                  var phone = or.phone;
                  delete or.phone;
                  or.contacts = {};
                  or.contacts.$elemMatch = {
                      value : phone,
                      type : enums.UserContactType.phone
                  };
              } else if (or.email) {
                  var email = or.email;
                  delete or.email;
                  or.contacts = {};
                  or.contacts.$elemMatch = {
                      value : email,
                      type : enums.UserContactType.email
                  };
              }
          });
      });
      
      if (andSearch.$and.length > 0) {
          requesterStages = requesterStages.concat([{
              $match : andSearch
          }]);
      }
      
      var params = {
          skip : skip,
          limit : limit,
          count : count
      };
      
      // count only
      if (count) {
          var countTask = new Promise((rsolve, rject) => {
              find(User, requesterStages, params, rsolve, rject);
          });
          
          countTask.then((countData) => {
              resolve(countData);
          }).catch((err) => {
              reject(err);
          });
          
          return;
      }
      
      var sortStage = {
          $sort : {
              add_time : 1
          }
      };
      
      // filter only necessary fields
      requesterStages = requesterStages.concat([{
          $project : {
              name : 1,
              email : 1,
              organizations : 1,
              upd_time : 1,
              add_time : 1,
              profile_image : 1
          }
      }, sortStage]);
      
      var findTask = new Promise((rsolve, rject) => {
          find(User, requesterStages, params, rsolve, rject);
      });
      
      findTask.then((findData) => {
          resolve(findData);
      }).catch((err) => {
          reject(err);
      });
  });
}

function findOrganizations(query) {
//  console.log(JSON.stringify(query));
  return new Promise((resolve, reject) => {
      var user = query.user;
      var textSearch = query.textSearch;
      var andSearch = query.andSearch;
      var skip = query.skip;
      var limit = query.limit;
      var count = query.count;
      
      if (andSearch.$and.length === 0 && textSearch.$text.$search.length === 0) { // ignore search on empty query
          return resolve({
              results : [],
              skip : skip,
              limit : limit,
              count : count
          });
      }
      
      var project = { // organization fields
          name : 1,
          tags : 1,
          notes : 1,
          domains : 1,
          add_time : 1,
          upd_time : 1
      };
      
      var organizationMatch = { // initial match
          ed_user_id : castToObjectId(utils.getParentUserId(user))
      };
      
      if (textSearch.$text.$search.length > 0) { // if text search exists
          organizationMatch.$text = textSearch.$text;
      }

      var organizationStages = [];
      organizationStages = organizationStages.concat([{
          $match : organizationMatch
      }, {
          $project : project
      }]);
      
      // transform user-friendly keywords to actual keywords
      andSearch.$and.forEach((and) => {
          var $or = and.$or;
          
          $or.forEach((or) => {
              if (or.id) {
                  var id = or.id;
                  delete or.id;
                  or._id = castToObjectId(id);
              } else if (or.created) {
                  var created = or.created;
                  delete or.created;
                  or.add_time = created;
              } else if (or.updated) {
                  var updated = or.updated;
                  delete or.updated;
                  or.upd_time = updated;
              }
          });
      });
      
      if (andSearch.$and.length > 0) {
          organizationStages = organizationStages.concat([{
              $match : andSearch
          }]);
      }
      
      var params = {
          skip : skip,
          limit : limit,
          count : count
      };
      
      // count only
      if (count) {
          var countTask = new Promise((rsolve, rject) => {
              find(User, organizationStages, params, rsolve, rject);
          });
          
          countTask.then((countData) => {
              resolve(countData);
          }).catch((err) => {
              reject(err);
          });
          
          return;
      }
      
      var sortStage = {
          $sort : {
              add_time : 1
          }
      };
      
      // filter only necessary fields
      organizationStages = organizationStages.concat([{
          $project : {
              name : 1,
              domains : 1,
              notes : 1,
              upd_time : 1,
              add_time : 1
          }
      }, sortStage]);
      
      var findTask = new Promise((rsolve, rject) => {
          find(Organization, organizationStages, params, rsolve, rject);
      });
      
      findTask.then((findData) => {
          resolve(findData);
      }).catch((err) => {
          reject(err);
      });
  });
}

/**
 * Escape regular expression characters.
 */
function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Cast to MongoDb Object Id.
 */
function castToObjectId(id) {
    try {
        return mongoose.Types.ObjectId(id);
    } catch (e) {
        return id;
    }
}

function find(model, stages, params, rsolve, rject) {
    if (params.count) {
        stages = stages.concat([{
            $group : {
                _id : null,
                total : {
                    $sum : 1
                }
            }
        }]);
    } else {
        // set skip if any
        if (params.skip) {
            var selectedAddTime = {
                $gt : params.skip
            };
            
            if (stages[stages.length - 1] && stages[stages.length - 1].$sort && stages[stages.length - 1].$sort.add_time === -1) {
                selectedAddTime = {
                    $lt : params.skip
                };
            }
            
            stages = stages.concat([{ 
                $match : {
                    add_time : selectedAddTime
                }
            }]);
        }
        
        // set limit
        stages = stages.concat([{ $limit : params.limit }]);
    }
    
    var searchTask = execute(model, stages);
    
    searchTask.then(data => {
        var skip = data[data.length - 1] && data[data.length - 1].add_time || undefined;
        
        var result = {
            results : data,
            skip : skip,
            limit : params.limit,
            count : params.count
        };
        
        rsolve(result);
    }).catch((err) => {
        rject(err);
    });
}

/**
 * Execute aggregate.
 */
function execute(model, options) {
//    console.log(JSON.stringify(options));
    
    return new Promise((resolve, reject) => {
        var results = [];

        var cursor = model.aggregate(options).read('secondaryPreferred').allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
        cursor.each(function(err, doc) {
            if (err) {
                console.error(err);
            }
            
            if (doc) {
                results.push(doc);
            } else {
                resolve(results);
            }
        });
    });
}

/**
 * Search tickets, agents, requesters or organizations.
 */
exports.searchByQuery = (req, res, next) => {
    console.log(JSON.stringify(req.query), JSON.stringify(req.body));
    var type = (req.query.type || req.body.type || '').toUpperCase(); // TICKETS, AGENTS, REQUESTERS, ORGANIZATIONS
    var query = req.query.query || req.body.query || ''; // search expression
    var count = (typeof req.query.count === 'undefined' ? req.body.count : req.query.count) === 'true' ? true : false; // return count in response;
    
    var skip = parseInt(req.query.skip);
    skip = isNaN(skip) ? undefined : skip;
    
    var limit = parseInt(req.query.limit);
    limit = isNaN(limit) ? enums.Settings.MAX_LIMIT : limit > enums.Settings.MAX_LIMIT ? enums.Settings.MAX_LIMIT : limit;
    
    var user = req.user;
    var searchType = enums.SearchType[type];
    
    if (typeof searchType === 'undefined') {
        return next(new TypeError('search.type.unsupported'));
    }

    var searchEnum = enums.SearchEnumKeyword[type];
    
    var tokens = getTokens({ query : query });
    
    var keywords = [];
    tokens.forEach((token) => {
        var keyword = getKeywordFromToken(token);

        if (!keyword.operator || enums.ValidSearchKeyword[type][keyword.key] || keyword.key.indexOf(enums.Settings.FIELD_KEY_PREFIX) === 0) { 
            keywords.push(keyword); // only accept valid keyword, stand alone text and custom field
        }
    });
    
    var conditions = keywords.map((keyword) => {
        return createCondition({ keyword : keyword, searchEnum : searchEnum, user : user });
    });
    
    // sort search option
    var sortSearch = {
        $sort : {}
    };
    
    // create text search for stand alone keywords
    var textSearch = { $text : {
        $search : ''
    }};
    
    // group the same keyword-operator key value to $or search
    var orSearch = {};
    conditions.forEach((keyword) => {
        var keywordType = keyword.keywordType;
        var key = keyword.key;
        var value = keyword.value;
        
        if (keywordType === 'text') {
            return textSearch.$text.$search += key.concat(' ');
        }
        
        if (keywordType === 'sort') {
            var isDesc = value.indexOf('-') === 0;
            
            if (isDesc) {
                sortSearch.$sort[value.substr(1)] = -1;
            } else {
                sortSearch.$sort[value] = 1;
            }
            
            return;
        }
        
        var condition = keyword.condition;
        var operator = keyword.operator;
        var opKey = key.concat(operator);
        
        orSearch[opKey] = orSearch[opKey] || { $or : [] };
        
        var or = {};
        or[key] = condition;
        
        orSearch[opKey].$or.push(or);
    });
    
    var andSearch = { $and : [] };
    
    // put all $or search into $and search
    Object.keys(orSearch).forEach((opKey) => {
        var $or = orSearch[opKey];
        andSearch.$and.push($or);
    });
    
    // trim text search
    textSearch.$text.$search = textSearch.$text.$search.trim();
    
    var searchQuery = {
        user : user,
        sortSearch : sortSearch,
        textSearch : textSearch,
        andSearch : andSearch,
        skip : skip,
        limit : limit,
        count : count
    };
    
    var searchTask;
    
    switch (searchType) {
        case enums.SearchType.TICKETS:
            searchTask = findTickets(searchQuery);
            break;
        case enums.SearchType.AGENTS:
            searchTask = findAgents(searchQuery);
            break;
        case enums.SearchType.REQUESTERS:
            searchTask = findRequesters(searchQuery);
            break;
        case enums.SearchType.ORGANIZATIONS:
            searchTask = findOrganizations(searchQuery);
            break;
        default:
            break;
    }
    
    searchTask.then((data) => {
        if (data.count) {
            var total = data.results[0] && data.results[0].total || 0;
            return res.json(total);
        }
        
        res.json(data.results);
    }).catch((err) => {
        console.error(err);
        next(new TypeError('search.error'));
    });
};
