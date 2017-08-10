// comment
var app_id = '#' + app.data.name;
var customers = {},
    orders = {};

// hide html
$('.details .detail', app_id).hide();

// delegate event click : show detail order
$(app_id).delegate('.rowgri span:first-child', 'click', function() {
    var classes = $(this).attr('class');

    if (classes.indexOf('rowgri-') > -1) {
        var id_order = classes.trim().replace('rowgri-', '');

        $('.details .detail', app_id).hide();
        $('.detail-' + id_order, app_id).show();
    }
});

// delegate event click : hide detail order
$(app_id).delegate('.close-detail', 'click', function() {
    $(this).parent().hide();
});

// delegate event : update note order
$(app_id).delegate('.button-act.act-update', 'click', function() {
    var note = $(this).prev().val().trim(),
        id_order = $(this).data('id-order');

    if (id_order) {
        var path = "/admin/orders/" + id_order + ".json";
        var data = {
            "order": {
                "id": id_order,
                "note": note
            }
        };

        update_note(path, data, note, $(this));
    }
});

// delegate event : update note customer
$(app_id).delegate('.button-act.act-update-customer', 'click', function() {
    var note = $(this).prev().val().trim(),
        id_customer = $(this).data('id-customer');

    if (id_customer) {
        var path = "/admin/customers/" + id_customer + ".json";
        var data = {
            "customer": {
                "id": id_customer,
                "note": note
            }
        };

        update_note(path, data, note, $(this));
    }
});

// show form update note && hidden form update note
$(app_id).delegate('.modify-note', 'click', function() {
    $(this).hide();
    $(this).next().show();
    $(this).parent().parent().find('.content-note').hide();
    $(this).parent().parent().find('.form-update-note').show();
});
$(app_id).delegate('.cancel-modify-note', 'click', function() {
    $(this).hide();
    $(this).prev().show();
    $(this).parent().parent().find('.content-note').show();
    $(this).parent().parent().find('.form-update-note').hide();
});

// show list order of customer
$(app_id).delegate('.customers p', 'click', function() {
    var id_customer_selected = $(this).data('id');

    // highlight item selected
    $(".customers p", app_id).removeClass('title-content');
    $(this).addClass('title-content');

    // remove content old
    $('.info_orders', app_id).html('');
    $('.details', app_id).html('');
    $('.grid-orders .content-grid', app_id).html('');

    // display info item
    show_orders(id_customer_selected);
});

if (app.params_url && app.params_url.ticket_id) {
    $.ajax({
        type : 'GET',
        url : '/api/ticket/contact-requester/' + app.params_url.ticket_id,
        cache : false,
        dataType : 'json',
        success : function(result) {
            if (result.is_error == false) {
                var data = result.data;
                var order_filter = phone_filter = query_filter = '';

                // order filter
                for (var i in data.emails) {
                    order_filter += ( order_filter ? '+' : '') + data.emails[i];
                }

                if (order_filter)
                    order_filter = 'email:customer=' + order_filter;

                // phone filter
                for (var i in data.phones) {
                    phone_filter += ( phone_filter ? '||' : '') + '(phone:customer**' + data.phones[i].replace(/^\+84/, '0') + ')';
                }

                if (order_filter && phone_filter) {
                    query_filter = 'query=filter=((' + order_filter + ')||' + phone_filter + ')';
                } else if (order_filter || phone_filter) {
                    query_filter = 'query=filter=(' + order_filter + phone_filter + ')';
                }

                if (query_filter) {
                    var option_request = {
                        request_opts : {
                            host : $.apps.get_param(app.secret, app.params.api_domain),
                            port : 443,
                            path : '/admin/customers.json?' + query_filter,
                            method : 'GET',
                            headers : {
                                'Authorization' : 'Basic #param.api_key#'
                            }
                        },
                        is_https : true
                    };

                    get_customers(option_request);
                } else {
                    $('.content-app', app_id).show();
                    $('.content-app', app_id).html('<div class="no-result">' + app.data.lng.text.no_result + '.</div>');
                }
            }
        },
        error : function(XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus);
        }
    });
}

/**
 * get list customers
 *
 */
function get_customers(option_request) {
    $.apps.fetch_data(app.data.name, option_request, function(data) {
        //show content
        $('.content-app', app_id).show();

        if (data && data.customers && data.customers.length > 0) {
            //get list customer
            data.customers.forEach(function(item) {
                if ( typeof customers[item.email] == 'undefined') {
                    customers[item.id] = (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '');
                }
            });

            // generate list customer
            for (var id in customers) {
                $('.customers', app_id).append('<p data-id="' + id + '">' + customers[id] + '</p>');
            }

            // selected first
            $('.customers p:first-child', app_id).addClass('title-content');
            var id_customer_selected = $('.customers p:first-child', app_id).data('id');

            if (id_customer_selected) {
                show_orders(id_customer_selected);
            }
        } else {
            $('.content-app', app_id).html('<div class="no-result">' + app.data.lng.text.no_result + '.</div>');
        }
    });
}


/**
 * update note
 *
 */
function update_note(path, data, note, target) {
    var option_request = {
        request_opts : {
            host : $.apps.get_param(app.secret, app.params.api_domain),
            port : 443,
            path : path,
            method : 'PUT',
            headers : {
                'Authorization' : 'Basic #param.api_key#',
                'Content-Type': 'application/json'
            }
        },
        is_https : true,
        post_data: data
    };

    $.apps.fetch_data(app.data.name, option_request, function(data) {
        var contain_elm = target.parent().parent();

        target.parent().hide();
        contain_elm.find('.cancel-modify-note').hide();
        contain_elm.find('.modify-note').show();
        contain_elm.find('.content-note').show().html(note ? note.replace(/\n/g, '<br/>') : app.data.lng.text.no_notes);
    });
}

/**
 * get list orders && generate html
 *
 */
function show_orders(id_customer) {
    var option_request = {
        request_opts : {
            host : $.apps.get_param(app.secret, app.params.api_domain),
            port : 443,
            path : '/admin/orders.json?customer_id=' + id_customer,
            method : 'GET',
            headers : {
                'Authorization' : 'Basic #param.api_key#'
            }
        },
        is_https : true
    };

    if ( typeof orders[id_customer] == "undefined") {
        $.apps.fetch_data(app.data.name, option_request, function(data) {
            orders[id_customer] = [];

            if (data && data.orders && data.orders.length > 0) {
                orders[id_customer] = data.orders.filter(function(item) {
                    return item && !item.cancel_reason;
                });
            }

            generate_html_orders(orders[id_customer]);
        });
    } else {
        generate_html_orders(orders[id_customer]);
    }
}

/**
 * generate html orders
 *
 */
function generate_html_orders(orders) {
    var data_replace = {},
        html_content = '';

    if (orders && orders.length > 0) {
        $('.info_orders, .details', app_id).show();
        $('.no-orders', app_id).hide();

        var info_orders = {
            orders_count : 0,
            total_spent : 0,
            note : orders[0].customer.note,
            currency : orders[0].currency,
            id_customer : orders[0].customer.id,
            lng : app.data.lng
        };

        var _date_format = (date_format_string ? date_format_string : 'MM/dd/yyyy') + ' HH:mm';

        orders.forEach(function(item) {
            // list orders
            data_replace = {
                id_row : item.order_number.replace('#', ''),
                status_css : item.fulfillment_status == 'fulfilled' ? 'status-success' : 'status-notice',
                status : item.fulfillment_status,
                lng : app.data.lng
            };

            html_content = $.apps.render_layout(app.data.name, 'tpl_row_order', data_replace);
            $('.grid-orders .content-grid', app_id).append(html_content);

            // detail every orders
            data_replace = {
                id_row : item.order_number.replace('#', ''),
                id_order: item.id,
                status_payment_css : item.financial_status == 'paid' ? 'status-success' : 'status-notice',
                status_payment : item.financial_status,
                status_fullfill_css : item.fulfillment_status == 'fulfilled' ? 'status-success' : 'status-notice',
                status_fullfill : item.fulfillment_status,
                note : item.note,
                line_items : item.line_items,
                shipping_address : item.shipping_address,
                subtotal : item.subtotal_price.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"),
                currency : item.currency,
                shippings : item.shipping_lines,
                total_price : item.total_price.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"),
                date_created : kendo.toString(new Date(item.created_at), _date_format),
                lng : app.data.lng
            };

            html_content = $.apps.render_layout(app.data.name, 'tpl_detail_order', data_replace);
            $('.details', app_id).append(html_content);

            // info orders
            info_orders.orders_count ++;
            info_orders.total_spent += item.total_price;
        });

        // format price
        info_orders.total_spent = info_orders.total_spent.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");

        html_content = $.apps.render_layout(app.data.name, 'tpl_info_orders', info_orders);
        $('.info_orders', app_id).append(html_content);
    } else {
        $('.info_orders, .details', app_id).hide();
        $('.no-orders', app_id).show();
    }
}
