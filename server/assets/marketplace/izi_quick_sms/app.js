{
    init: ()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        this._t = _t;
        this._m = _m;
        var state = this.config.getState('mde-tabs-id-izi_quick_sms') || {};
        this.tabs = {
            id: 'izi_quick_sms',
            config: {
                selected: state.selected || 'filter',
                tabs: [{
                    id: 'filter',
                    name: _t.filter_contact,
                    viewHtml : this.app_data.templates['tpl_tab_filter'],
                    viewModel: this.getFilterModel()
                },{
                    id: 'import',
                    name: _t.import,
                    viewHtml: this.app_data.templates['tpl_tab_import'],
                    viewModel: this.getImportModel()
                }]
            }
        };
    },
    getFilterModel: ()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        var that = this;
        var FilterView = function(){
            this._t = _t;
            this.templates = that.app_data.templates;
            this.false = false;
            this.fields = [];
            this.activate = ()=>{
                this.initData();
            };
            
            this.initData = ()=>{
                that.http.fetch('custom-settings/user?is_active=1&limit=0')
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
                    this.fields = fields;
                }).catch(ex => {
                    console.log(ex);
                });;
                var state = that.config.getState('quick-sms-filter') || {};
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
            };
            
            //// organization change
            this.orgChange = (evt)=>{
                if(evt.detail && evt.detail.value && evt.detail.value._id){
                    this.master.requester.url = `people/organizations/${evt.detail.value._id}/requester?limit=15`;
                }else{
                    this.master.requester.url = `people/organizations/null/requester?limit=15`;
                }
            };
            
            this.sendSms = ()=>{
                var data = {
                    date_type: this.filterData.dateType,
                    from_date: this.filterData.fromDate,
                    toDate: this.filterData.toDate,
                    custom_fields: {},
                    content: this.formData.content
                };
                if(this.filterData.requester){
                    data['requester']= this.filterData.requester;
                }
                if(this.filterData.org){
                    data['organization'] = this.filterData.org;
                }
                
                this.fields.forEach(field=>{
                    if(field.checked){
                        data.custom_fields[field.field_key] ={
                            cs_type: field.cs_type,
                            value:field.value
                        };
                    }
                });
                
                this.progressing = true;
                that.http.post('apps/quick-sms/send', data).then(result=>{
                    if(result.errors){
                        if(result.errors.single){
                            that.notify.notifier(_m[result.errors.single]);
                        }
                    }
                    this.progressing = false;
                    this.formData.content = "";
                }).catch(ex=>{
                    this.progressing = false;
                    console.log(ex);
                });
            
                var state = that.config.getState('quick_sms') || {};
                state.filterData = this.filterData;
                that.config.setState('quick-sms-filter', state, true);
            }
        };
        FilterView.prototype = {
            _t: _t,
            _m: _m,
            master: {
                dateOptions:[
                    {id: 'add_time', text: _t.add_date},
                    {id: 'upd_time', text: _t.updated_date}
                ],
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
        return new FilterView;
    },
    getImportModel:()=>{
        var _t = this.app_data.lng.translate;
        var _m = this.app_data.lng.message;
        var that = this;
        var ImportView = function(){
            this._t = _t;
            this.templates = that.app_data.templates;
            this.table = {
                data: [],
                selectedRows: [],
                selectedAll: false
            };
            
            this.activate = ()=>{
                return new Promise((resolve)=>{
                    this.initData();
                    resolve();
                });
            };
            
            this.initData = ()=>{};
            this.checkedAll = ()=>{
                if(this.table.selectedAll){
                    this.table.selectedRows = this.table.data.map(row=>{
                        return row.value;
                    });
                }else{
                     this.table.selectedRows = [];
                }
            };
            this.checkedMe = ()=>{
                this.table.selectedAll = this.table.selectedRows.length == this.table.data.length;
            };
            this.sendSms = ()=>{
                var data = {
                    sms_upload: this.file,
                    content: this.formData.content
                };
                
                this.isProgressing = true;
                that.http.postFormData('apps/quick-sms/from-file', data).then(result=>{
                    if(result.errors){
                        if(result.errors.single){
                            that.notify.notifier(_m[result.errors.single]);
                        }
                    }
                    this.isProgressing = false;
                    this.formData.content = "";
                }).catch(ex=>{
                    this.isProgressing = false;
                    console.log(ex);
                });
            };
            this.fileChanged = ($event)=>{
                if($event.constructor === Event && $event.target.files[0]){
                    let file =  $event.target.files[0];
                    if(this.fileAccept.indexOf(file.type) == -1){
                        that.errors.clearFormErrors("#upload-form");
                        document.getElementById('upload-form').reset()
                        this.file = null;
                        that.errors.showErrorsForInput(document.getElementById('upload-input'), ['import.ticket.import_file']);
                        return false;
                    }else if(file.size > that.config.size_upload){
                        that.errors.clearFormErrors("#upload-form");
                        document.getElementById('upload-form').reset();
                        this.file = null;
                        that.errors.showErrorsForInput(document.getElementById('upload-input'), ['common.upload_file.size']);
                        return false;
                    }else{
                        that.errors.clearFormErrors("#upload-form");
                    }
                }
            }
        };
        ImportView.prototype = {
            _t: _t,
            _m: _m,
            fileAccept : "text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            importProcessing: false,
            isProgressing: false,
            formData: {
            },
            filterData:{}
        };
        return new ImportView;
    }
}