// comment
var app_id = '#' + app.data.name;
var limit = 15, skip = 0, total = 0;

var list_width = $('.tickets', app_id).width();
if(list_width <=0){
    list_width = 280;
}
$(app_id).css({display: 'block'});

// load tickets
get_list_tickets_of_requester();

$('.refresh_ticket', app_id).click(function(){
//    skip = 0; // reset
    get_list_tickets_of_requester();
});

function get_list_tickets_of_requester () {
    var requester_id = ticketModel.get('ticket.requester');
    
    if (requester_id) {
        $.ajax({
            type : 'GET',
            url : '/api/tickets/by/requester/' + requester_id + '/' + skip + '/' + limit,
            cache : false,
            dataType : 'json',
            success : function(result) {
                if (result && result.code) {
                    var tickets = result.data && result.data.tickets ? result.data.tickets : [];
                    var total_tickets = result.data && result.data.total ? result.data.total : 0;
                    var has_result = false;

                    $('.requester-tickets .tickets', app_id).html('');
                    tickets.forEach(function(item){
                        if (item.subject) {
                            has_result = true;

                            var data_replace = {
                                id_ticket : item.id,
                                subject: item.subject,
                                status: item.status_tpl,
                                date_request: item.requested_fromNow
                            };

                            var html_content = $.apps.render_layout(app.data.name, 'tpl_app_requester_item_ticket', data_replace);
                            $('.requester-tickets .tickets', app_id).removeClass('no_result').append(html_content);
                        }
                    });

                    if (has_result == false) {
                        $('.group_btn_request', app_id).hide();

                        var html_content = $.apps.render_layout(app.data.name, 'tpl_app_requester_no_result', {lng : app.data.lng});
                        $('.requester-tickets .tickets', app_id).addClass('no_result').html(html_content);
                    } else {
                        $('.tickets .subject', app_id).css('width', parseInt(list_width - 65));

                        if (total_tickets > limit && limit > 0) {
                            $('.group_btn_request', app_id).show();
                            $('.prev_request, .next_request', app_id).removeClass('disactive');

                            total = total_tickets;
                            var total_page = Math.ceil(total_tickets / limit);
                            var curr_page = parseInt(skip / limit) + 1;

                            if (curr_page == 1) {
                                $('.prev_request', app_id).addClass('disactive');
                            }

                            if (curr_page == total_page) {
                                $('.next_request', app_id).addClass('disactive');
                            }
                        } else {
                            $('.group_btn_request', app_id).hide();
                        }
                    }
                }
            },
            error : function(XMLHttpRequest, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
        $.ajax({
            type: 'GET',
            url : '/api/requester/detail/' + requester_id,
            cache: false,
            dataType: 'json',
            success : function (result){
                if(result && result.code){
                    var requester_contact = result.data && result.data.contacts ? result.data.contacts :[];
                    $('.requester-tickets .profile .body_menu2', app_id).html('');
                    var contact_email=[];
                    var contact_phone = [];
                    var contact_facebook =[];
                    requester_contact.forEach(function(item){
                       if(item.type == 0){
                           contact_email.push(item.value);
                       }
                       if(item.type == 1) {
                           contact_phone.push(item.value);
                       }
                       if(item.type == 2){
                           contact_facebook.push(item.value);
                       }
                    });
                    var data_replace = {
                            data : result.data,
                            lng : app.data.lng,
                            contact : {
                                contact_email,
                                contact_phone,
                                contact_facebook
                            },
                            current_locale : current_locale
                    };
                    var html_content = $.apps.render_layout(app.data.name, 'tpl_app_requester_contact', data_replace);
                    $('.requester-tickets .profile', app_id).removeClass('no-result').find(".body_menu2").append(html_content);
                    if (result.data.length == 0) {
                        $('.group_btn_request', app_id).hide();

                        var html_content = $.apps.render_layout(app.data.name, 'tpl_app_requester_no_result', {lng : app.data.lng});
                        $('.requester-tickets .profile', app_id).addClass('no_result').find(".body_menu2").html(html_content);
                    }
                }
            },
            error : function(XMLHttpRequest, testStatus, errorThrown){
                console.log(testStatus);
            }
        });
    } else {
        var html_content = $.apps.render_layout(app.data.name, 'tpl_app_requester_no_result', {lng : app.data.lng});
        $('.requester-tickets .tickets', app_id).addClass('no_result').html(html_content);
        $('.requester-tickets .profile', app_id).addClass('no_result').find(".body_menu2").html(html_content);
    }
}

// events clicks
$(app_id).delegate('.prev_request', 'click', function() {
    var classes = $(this).attr('class');

    if (classes.indexOf('disactive') == -1) {
        if ((skip - limit) >= 0) {
            skip = skip -limit;
            get_list_tickets_of_requester();
        }
    }
});

$(app_id).delegate('.next_request', 'click', function() {
    var classes = $(this).attr('class');

    if (classes.indexOf('disactive') == -1) {
        if ((skip + limit) < total) {
            skip = skip +limit;
            get_list_tickets_of_requester();
        }
    }
});
