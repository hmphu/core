{
    init: ()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        var state = this.config.getState('mde-tabs-id-izi_quick_update') || {};
        this.tabs = {
            id: 'izi_quick_update',
            config: {
                selected: state.selected || 'view',
                tabs: [{
                    id: 'view',
                    name: _t.view,
                    viewHtml : this.app_data.templates['tpl_tab_view'],
                    viewModel: this.getViewModel()
                },{
                    id: 'schedule',
                    name: _t.overdue_tasks,
                    viewHtml: this.app_data.templates['tpl_tab_task'],
                    viewModel: this.getTaskModel()
                },{
                    id: 'report',
                    name: _t.report,
                    viewHtml: this.app_data.templates['tpl_tab_report'],
                    viewModel: this.getReportModel()
                }]
            }
        };
    },
    getViewModel: ()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        var that = this;
        var View = function(){
            this._t = _t;
            this.false = false;
            this.activate = ()=>{
                this.initData();
            };
            
            this.filter = (is_reset)=>{
                var url_count = 'apps/quick-update/count?type=view';
                var url = 'apps/quick-update/list?type=view&skip=${'+this.filterData.dateType+'}';
                var query = [];
                
//                query.push(`status=${this.filterData.status-1}`);
                query.push(`date_type=${this.filterData.dateType}`);
                query.push(`from_date=${this.filterData.fromDate}`);
                query.push(`to_date=${this.filterData.toDate}`);
                
                if(this.filterData.status){
                    query.push(`status=${this.filterData.status-1}`);
                }
                if(this.filterData.group){
                    query.push(`group=${this.filterData.group}`);
                }
                if(this.filterData.agent){
                    query.push(`agent=${this.filterData.agent}`);
                }
                if(this.filterData.requester){
                    query.push(`requester=${this.filterData.requester}`);
                }
                if(this.filterData.org){
                    query.push(`organization=${this.filterData.org}`);
                }
                url_count = `${url_count}&${query.join('&')}`;
                url = `${url}&${query.join('&')}`;
                
                this.masterData(url, url_count, is_reset);
                var state = that.config.getState('quick_update_view') || {};
                state.filterData = this.filterData;
                that.config.setState('quick-update-view', state, true);
            };
            
            this.masterData = (url, url_count, is_reset)=>{
                this.table = {
                    id: this.id,
                    headers: [
                    {
                        label: '',
                        type: 'compose',
                        path: 'resources/custom-elements/status',
                        style: 'width: 5%',
                        class: 'mde-tCenter'
                    },
                    {
                        label: 'ticket_view.subject',
                        name: 'subject',
                        type: 'link',
                        link: '#/izi/ticket/edit/${_id}',
//                        html: (data) =>{
//                            return data.subject || '----';
//                        },
                        style: 'width: 20%',
                        maxLength: 70
                    },{
                        label: 'ticket_view.requester',
                        type: 'html',
                        html: (data) =>{
                            return (data.requester || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'header.organization',
                        type: 'html',
                        html: (data) =>{
                            return (data.organization || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.group',
                        type: 'html',
                        html: (data) =>{
                            return (data.group || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.agent',
                        type: 'html',
                        html: (data) =>{
                            return (data.agent || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.add_time',
                        type: 'date',
                        name: 'add_time',
                        is_time: true,
                        style: 'width: 15%'
                    }],
                    url: url,
                    checkable: {
                        id: '_id',
                        delete_url: 'tickets-delete'
                    },
                    config: {
                        realtime: 'izi-client-v2-ticket-data',
                        totalUrl: url_count,
                        highlightedField: 'add_time'
                    },
                    is_reset: is_reset
                };
            };
            
            this.initData = ()=>{
                var state = that.config.getState('quick-update-view') || {};
                this.filterData = state.filterData || {};
                this.formData = state.formData || {};
                if(!this.filterData.fromDate){
                    var date = that.moment(this.filterData.toDate);
                    this.filterData.fromDate = +that.moment(date).utcOffset(that.me.time_zone.value).add(-1, "month").endOf('day');
                    this.filterData.toDate = +that.moment(date).utcOffset(that.me.time_zone.value).endOf('day');
                }else{
                    this.filterData.fromDate = +that.moment(this.filterData.fromDate).utcOffset(that.me.time_zone.value).endOf('day');
                    this.filterData.toDate = +that.moment(this.filterData.toDate).utcOffset(that.me.time_zone.value).endOf('day');
                }
               
                this.filterData.dateType = this.filterData.dateType || 'add_time';
//                this.filterData.status = this.filterData.status || 1;
                
                this.formData.status = this.formData.status || 1;
                this.filter(false);
            };
            
            // events
            this.groupChange = (evt)=>{
                if(evt.detail && evt.detail.value && evt.detail.value._id){
                    this.master.agent.url = this.master.agent.url.replace(/group_id=(.*?)&(.*?)/gi, 'group_id='+evt.detail.value._id+'&$2');
                }
            };
            //// organization change
            this.orgChange = (evt)=>{
                if(evt.detail && evt.detail.value && evt.detail.value._id){
                    this.master.requester.url = `people/organizations/${evt.detail.value._id}/requester?limit=15`;
                }else{
                    this.master.requester.url = `people/organizations/null/requester?limit=15`;
                }
            };
            //// update ticket click
            this.replyTickets = ()=>{
                this.progress.reply = true;
                that.http.post('apps/quick-update/update', this.formData).then(result=>{
                    setTimeout(()=>{
                        that.notify.notifier(_m.ticket_s_has_been_updated_success, 'success');
                        this.progress.reply = false;
                    },3000);
                }).catch(ex=>{
                    this.progress.reply = false;
                    console.log(ex);
                });
            };
            this.resetForm = ()=>{
                this.formData.agent = null;
                this.formData.group = null;
                this.formData.comment = null;
            };
            
            this.validateForm = ()=>{
                
            };
            this.exportTicket = (type)=>{
                var data = {
                    app_id: that.app_data.id,
                    id_tickets: this.formData.ids,
                    type: type
                }
                this.progress[type] = true;
                that.http.post('apps/quick-update/export', data).then(result=>{
                    window.open(location.origin+result.url, "_blank");
                    setTimeout(()=>{
                        this.progress[type] = false;
                    },3000);
                }).catch(ex=>{
                    this.progress[type] = false;
                    console.log(ex);
                });
            }
        };
        View.prototype = {
            _t: _t,
            _m: _m,
            master: {
                dateOptions:[
                    {id: 'add_time', text: _t.add_date},
                    {id: 'upd_time', text: _t.updated_date},
                    {id: 'solved_date', text: _t.solved_date}
                ],
                ticketStatus:[
                    {id: 1, text: 'ticket.status.new_status', is_translate:true},
                    {id: 2, text: 'ticket.status.open_status', is_translate:true},
                    {id: 3, text: 'ticket.status.pending_status', is_translate:true},
                    {id: 4, text: 'ticket.status.solve_status', is_translate:true},
                ],
                replyStatus:[
                    {id: 1, text: 'ticket.status.open_status', is_translate:true},
                    {id: 2, text: 'ticket.status.pending_status', is_translate:true},
                    {id: 3, text: 'ticket.status.solve_status', is_translate:true},
                ],
                agent:{
                    url: 'people/groups/list/agents?is_search_agent=1&group_id=&limit=15',
                    mapping:{
                        id:"user_id",
                        text: "name",
//                        options: {
//                            name: 'users',
//                            id: '_id',
//                            text: 'name'
//                        }
                    }
                },
                replyAgent:{
                    url: 'people/groups/list/agents?&group_id=&limit=15',
                    mapping:{
                        id:"user_id",
                        text: "group_name",
                        options: {
                            name: 'users',
                            id: '_id',
                            text: 'name'
                        }
                    }
                },
                group:{
                    url:'people/groups?limit=15',
                    mapping: {
                        id: 'group_id',
                        text: 'group_name'

                    }
                },
                requester: {
                    url: 'people/user?role=requester',
                     mapping:{
                        id:"_id",
                        text: "name"
                    }
                },
                org: {
                    url:'people/organizations?limit=15',
                    mapping: {
                        id: '_id',
                        text: 'name'
                    }
                },
            },
            filterData: {},
            formData: {
                ids:[]
            },
            progress : {
                reply: false,
                single: false,
                multi: false
            },
            agentChange:(evt)=>{
            },
            statusChange: (evt)=>{
                
            },
            requesterChange:(evt)=>{
                
            }
        };
        return new View;
    },
    getTaskModel:()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        var that = this;
        var Task = function(){
            this._t = _t;
            this.activate = ()=>{
                this.initData(false);
            };
            
            this.masterData = (url, url_count, is_reset)=>{
                this.table = {
                    id: this.id,
                    headers: [
                    {
                        label: '',
                        type: 'compose',
                        path: 'resources/custom-elements/status',
                        style: 'width: 5%',
                        class: 'mde-tCenter'
                    },
                    {
                        label: 'ticket_view.subject',
                        name: 'subject',
                        type: 'html',
                        html: (data) =>{
                            return data.subject || '----';
                        },
                        style: 'width: 25%',
                        maxLength: 70
                    },{
                        label: 'ticket_view.requester',
                        type: 'html',
                        html: (data) =>{
                            return (data.requester || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.group',
                        type: 'html',
                        html: (data) =>{
                            return (data.group || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.agent',
                        type: 'html',
                        html: (data) =>{
                            return (data.agent || {}).name || '----';
                        },
                        style: 'width: 15%'
                    },{
                        label: 'ticket_view.add_time',
                        type: 'date',
                        name: 'add_time',
                        is_time: true,
                        style: 'width: 15%'
                    }],
                    url: url,
                    checkable: {
                        id: '_id'
                    },
                    config: {
                        realtime: 'izi-client-v2-ticket-data',
                        totalUrl: url_count,
                        highlightedField: 'add_time'
                    },
                    is_reset: is_reset
                };
            };
            this.initData = (is_reset)=>{
                var url_count = 'apps/quick-update/count?type=overdue';
                var url = 'apps/quick-update/list?type=overdue&skip=${add_time}';
                this.masterData(url, url_count, is_reset);
            };
        };
        Task.prototype = {
            _t: _t,
            _m: _m,
            master: {
            },
            selectedRows:[],
        };
        return new Task;
    },
    getReportModel:()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;

        var that = this;
        var Report = function(){
            this._t = _t;
            this.templates = that.app_data.templates;
            this.fields = {};
            this.ticket_fields = [];
            this.activate = ()=>{
                return new Promise((resolve)=>{
                    this.initData();
                    resolve();
                });
            };
            
            this.initData = ()=>{
                var state = that.config.getState('quick-update-report') || {};
                that.http.fetch('custom-settings/ticket?is_active=1&limit=0')
                .then(result => {
                    let fields = result || [];
                    let _fields ={};
                    fields.forEach(field =>{
                        field.checked = false;
                        if(state.cs && state.cs[field.field_key]){
                            field.checked = true;
                            field.value = state.cs[field.field_key].value;
                        }
                        switch(field.cs_type){
                            case 'number':
                                field.field_type = 'number';
                                break;
                            case 'text':
                                if(!field.cs_type_data.is_multiline && !field.cs_type_data.is_link){
                                    field.field_type = 'text';
                                }
                                else if(field.cs_type_data.is_multiline && !field.cs_type_data.is_link){
                                    field.field_type = 'multi_text';
                                }
                                else if(!field.cs_type_data.is_multiline && field.cs_type_data.is_link){
                                    field.field_type = 'link';
                                }
                                else if(field.cs_type_data.is_multiline && field.cs_type_data.is_link){
                                    field.field_type = 'multi_text';
                                }
                                else{
                                    field.field_type = 'text';
                                }
                                break;
                            case 'dropdown':
                                if(!field.cs_type_data.is_multi_choice){
                                    field.field_type = 'dropdown';
                                }
                                else{
                                    field.field_type = 'dropdown_multi';
                                }
                                break;
                            case 'choice':
                                if(!field.cs_type_data.is_radio){
                                    field.field_type = 'choice';
                                }
                                else{
                                    field.field_type = 'choice_radio';
                                }
                                break;
                            case 'slider':
                                field.field_type = 'slider';
                                break;
                            case 'switch':
                                field.field_type = 'switch';
                                break;
                            case 'date':
                                if(!field.cs_type_data.is_datetime){
                                    field.field_type = 'time_picker';
                                }
                                else{
                                    field.field_type = 'datetime_picker';
                                }
                                break;
                            default:
                                field.field_type = 'text';
                                break;    
                        }
                        field.tpl_field = 'tpl_field_'+ field.field_type;
                    });
//                    this.fields = _fields;
                    this.ticket_fields = fields;
                })
                .catch(ex => {
                    console.log(ex);
                });
                
                this.filterData = state.filterData || {};
                this.filterData.ticket_type = this.filterData.ticket_type || 'voip';
                this.filterData.date_type = this.filterData.date_type || 'add_time';
                this.filterData.month = that.moment.utc();
            };
            
            this.generateChart = (data)=>{
                var options = {
                    bindto: '#chart',
                    data: {
                        json: data.report,
                        keys: {
                            x: 'day_name', // it's possible to specify 'x' when category axis
                            value: ['count'],
                        },
                        labels: {
                            format: (v) =>{
                                return v? `${v}`:''
                            }
                        },
                        type: 'bar'
                    },
                    axis: {
                        x: {
                            type: 'category'
                        },
                        y: {
                            padding: { bottom: 0},
                            min:0,
//                            tick: {
//                              values: [1, 2, 3, 4, 5]
//                            }
                        }
                    },
                    grid: {
                        x: {
                            show:true
                        },
                        y:{show:true}
                    },
                    legend: {
                        show: false
                    },
                    tooltip: {
                      show: false
                    }
                };
//                
//                if(data.max == 0 || (data.max >=1 && data.max<50)){
//                    console.log("===============");
//                    options.axis.y.tick = { values : rang.r1};
//                }
//                else if(data.max >=50 && data.max<100){
//                    options.axis.y.tick = { values : rang.r100};
//                }
//                else if(data.max >=100 && data.max<500){
//                    options.axis.y.tick = { values : rang.r500};
//                }
//                else if(data.max >=500 && data.max<=1000){
//                    options.axis.y.tick = { values : rang.r1000};
//                }
//                if(this.chart){
//                    this.chart.load(options);
//                }else{
                    this.chart = that.c3.generate(options);
//                }
                
            }
            this.report = ()=>{
                var fields = {};
                this.ticket_fields.forEach(field=>{
                    if(field.checked){
                        fields[field.field_key] ={
                            cs_type: field.cs_type,
                            value:field.value
                        };
                    }
                });
                var data = Object.assign({},this.filterData);
                if(Object.keys(fields).length > 0){
                    data.custom_settings = fields;
                }
                that.config.setState("quick-update-report", {filterData: this.filterData, cs:fields}, true);
                this.isProgress = true;
                that.http.post('apps/quick-update/report', data).then(result=>{
                    console.log(result);
                    this.generateChart(result);
                    this.isProgress = false;
                }).catch(ex=>{
                    console.log(ex);
                    this.isProgress = false;
                });
            }
        };
        Report.prototype = {
            _t: _t,
            _m: _m,
            master: {
                dateOptions:[
                    {id: 'add_time', text: _t.add_date},
                    {id: 'upd_time', text: _t.updated_date},
                    {id: 'solved_date', text: _t.solved_date}
                ],
                ticketType:[
                    { text : _t._voip_,id : 'voip'},
                    { text : _t._web_,id : 'web'},
                    { text : _t._mail_,id : 'iziMail'}
                ]
            },
            isProgress: false,
            filterData:{}
        };
        return new Report;
    }
}