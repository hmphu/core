'use strict';
/**
 * Module dependencies.
 */
var peoplePolicy = require('../policies/people.user.policy'),
    path = require('path'),
    userController = require(path.resolve('./modules/user/controllers/users/user.auth.controller')),
    people = require('../controllers/people.user.controller');

module.exports = (app) => {
    // people collection routes
    app.route('/api/people/user').all(userController.authenticateApi, peoplePolicy.isAllowed)
        .get(people.list)
        .post(peoplePolicy.isAuth, peoplePolicy.checkRoleAdd, people.add);

    // count people collection routes
    app.route('/api/people/count/user').all(peoplePolicy.isAllowed)
        .get(people.count);
    
    //Find or create requesters by contact value
    app.route('/api/people/contact').all(userController.authenticateApi, peoplePolicy.isAllowed)
        .get(people.findOrAdd);
    
    //Delete or suspend requesters from view
    app.route('/api/people/requester-delete').all(peoplePolicy.isAllowed)
        .delete(people.deleteOrSuspendRequester);

    app.route('/api/people/users-delete/:agent_delete/:agent_assign').all(peoplePolicy.isAllowed)
        .delete(people.deleteUser);

    app.route('/api/people/agent-ticket/:userId').all(peoplePolicy.isAllowed)
        .get(people.countTicketsAgent);
    
    // Single routes
    app.route('/api/people/user/:userId').all(userController.authenticateApi, peoplePolicy.isAllowed)
        .get(people.read)
        .put(peoplePolicy.checkRole, people.update)
        .delete(peoplePolicy.checkRole, people.toggle_suspended);
    

    // Finish by binding the people middleware
    app.param('userId', (req, res, next, id) =>{
        userController.authenticateApi(req, res, (err, result) =>{
            if(err){
                return next(err);
            }
            peoplePolicy.isAllowed(req, res, (err, result) =>{
                people.userByID(req, res, next, id);
            });
        })
    });
};
