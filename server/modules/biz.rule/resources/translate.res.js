'use strict';
//
//  translate.res.js
//  translate text
//
//  Created by khanhpq on 2015-01-19.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

module.exports = {
    en: {
        clone: "clone",
        trigger: {
            received_request: {
                name: "Notify requester of received request",
                subject: "Notify requesters of received request", 
                body: "Your request ({{ticket.link}}) has been received and is being reviewed by our support staff.\r\n\r\nTo add additional comments, reply to this email."
            },
            comment_update: {
                name: "Notify assignee of comment update",
                subject: "Re: {{ticket.title}}", 
                body: "This ticket (#{{ticket.link}}) has been updated.\r\n\r\n{{ticket.comment}}"
            },
            group_assignment: {
                name: "Notify group of assignment",
                subject: "Notify groups of assignment: {{ticket.title}}", 
                body: "This ticket (#{{ticket.link}}) has been assigned to group '{{ticket.group.name}}', of which you are a member.\r\n\r\n{{ticket.comment}}"
            },
            agents_received_request: {
                name: "Notify all agents of received request",
                subject: "{{ticket.title}}", 
                body: "A ticket (#{{ticket.link}}) by {{ticket.requester.name}} has been received. It is unassigned."
            },
            customer_satisfaction_rating: {
                name: "customer satisfaction rating",
                subject: "Please let us know about your satisfaction on this ticket", 
                body: "Your request ({{ticket.title}}) has been completed. Please let us know about your satisfaction, otherwise you can reply this email if you are not satisficed. <br> <br> <strong>How do you think about our support ?</strong> <br> <br> <a href='{{ticket.good_rating_link}}'>Good, I'm satisfied</a> <br> <br> <a href='{{ticket.bad_rating_link}}'>Bad, I'm satisfied</a>"
            }
        },
        macro: {
            customer_not_responding: {
                name: "Customer not responding",
                text: "Hello  {{ticket.requester.name}}. Our agent {{current_user.name}} has tried to contact you about this support request but we haven't heard back from you yet. Please let us know if we can be of further assistance. Thanks."
            },
            downgrade_and_inform: {
                name: "Downgrade and inform",
                text: "We're currently experiencing unusually high traffic. We'll get back to you as soon as possible"
            }
        },
        view: {
            user:{
                
            },
            ticket: {
                solved: "Solved tickets",
                pending_tickets: "Pending tickets",
                recently_updated: "Recently updated tickets",
                all_unsolved: "All unsolved tickets",
                unassigned: "Unassigned tickets",
                your_unsolved: "Your unsolved tickets"
            }
        },
        auto: {
                close_ticket_4d: "Close ticket 4 days after status is set to solved",
                pending_notification_24h: {
                    name: "Pending notification 24 hours",
                    body: "This is an email to remind you that your request (#{{ticket.link}}) is pending and awaits your feedback.\n\n{{ticket.comment}} ", 
                    subject: "Pending request: {{ticket.title}}"
                },
                pending_notification_5d: {
                    name: "Pending notification 5 days",
                    body: "This is an email to remind you that your request (#{{ticket.link}}) has been pending for 5 days and awaits your feedback.\n\n{{ticket.comment}} ", 
                    subject: "Pending request: {{ticket.title}}"
                },
                customer_satisfaction_rating: {
                    name: "Customer satisfaction rating",
                    body: "Your request ({{ticket.title}}) has been completed. Please let us know about your satisfaction, otherwise you can reply this email if you are not satisficed. <br> <br> <strong>How do you think about our support ?</strong> <br> <br> <a href='{{ticket.good_rating_link}}'>Good, I'm satisfied</a> <br> <br> <a href='{{ticket.bad_rating_link}}'>Bad, I'm satisfied</a>", 
                    subject: "Please let us know about your satisfaction on this ticket"
                }
        }
    },
    vi: {
        clone: "clone",
        trigger: {
            received_request: {
                name: "Notify requester of received request",
                subject: "Notify requesters of received request", 
                body: "Your request ({{ticket.link}}) has been received and is being reviewed by our support staff.\r\n\r\nTo add additional comments, reply to this email."
            },
            comment_update: {
                name: "Notify assignee of comment update",
                subject: "Re: {{ticket.title}}", 
                body: "This ticket (#{{ticket.link}}) has been updated.\r\n\r\n{{ticket.comment}}"
            },
            group_assignment: {
                name: "Notify group of assignment",
                subject: "Notify groups of assignment: {{ticket.title}}", 
                body: "This ticket (#{{ticket.link}}) has been assigned to group '{{ticket.group.name}}', of which you are a member.\r\n\r\n{{ticket.comment}}"
            },
            agents_received_request: {
                name: "Notify all agents of received request",
                subject: "{{ticket.title}}", 
                body: "A ticket (#{{ticket.link}}) by {{ticket.requester.name}} has been received. It is unassigned."
            },
            customer_satisfaction_rating: {
                name: "customer satisfaction rating",
                subject: "Please let us know about your satisfaction on this ticket", 
                body: "Your request ({{ticket.title}}) has been completed. Please let us know about your satisfaction, otherwise you can reply this email if you are not satisficed. <br> <br> <strong>How do you think about our support ?</strong> <br> <br> <a href='{{ticket.good_rating_link}}'>Good, I'm satisfied</a> <br> <br> <a href='{{ticket.bad_rating_link}}'>Bad, I'm satisfied</a>"
            }
        },
        macro: {
            customer_not_responding: {
                name: "Customer not responding",
                text: "Hello  {{ticket.requester.name}}. Our agent {{current_user.name}} has tried to contact you about this support request but we haven't heard back from you yet. Please let us know if we can be of further assistance. Thanks."
            },
            downgrade_and_inform: {
                name: "Downgrade and inform",
                text: "We're currently experiencing unusually high traffic. We'll get back to you as soon as possible"
            }
        },
        view: {
            user:{
                
            },
            ticket: {
                solved: "Solved tickets",
                pending_tickets: "Pending tickets",
                recently_updated: "Recently updated tickets",
                all_unsolved: "All unsolved tickets",
                unassigned: "Unassigned tickets",
                your_unsolved: "Your unsolved tickets"
            }
        },
        auto: {
                close_ticket_4d: "Close ticket 4 days after status is set to solved",
                pending_notification_24h: {
                    name: "Pending notification 24 hours",
                    body: "This is an email to remind you that your request (#{{ticket.link}}) is pending and awaits your feedback.\n\n{{ticket.comment}} ", 
                    subject: "Pending request: {{ticket.title}}"
                },
                pending_notification_5d: {
                    name: "Pending notification 5 days",
                    body: "This is an email to remind you that your request (#{{ticket.link}}) has been pending for 5 days and awaits your feedback.\n\n{{ticket.comment}} ", 
                    subject: "Pending request: {{ticket.title}}"
                },
                customer_satisfaction_rating: {
                    name: "Customer satisfaction rating",
                    body: "Your request ({{ticket.title}}) has been completed. Please let us know about your satisfaction, otherwise you can reply this email if you are not satisficed. <br> <br> <strong>How do you think about our support ?</strong> <br> <br> <a href='{{ticket.good_rating_link}}'>Good, I'm satisfied</a> <br> <br> <a href='{{ticket.bad_rating_link}}'>Bad, I'm satisfied</a>", 
                    subject: "Please let us know about your satisfaction on this ticket"
                }
        }
    }
};
