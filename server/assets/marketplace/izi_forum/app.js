{
    init : () => {
        this._t = this.app_data.lng.translations;
        this._m = this.app_data.lng.messages;
        var state = this.config.getState('mde-tabs-id-izi-forum') || {};
        this.tabs = {
            id : 'izi-forum',
            config : {
                selected : state.selected || 'post',
                tabs : [{
                    id : 'post',
                    name : this._t.post_title,
                    viewHtml : this.app_data.templates['tpl_tab_post'],
                    viewModel : this.getPostViewModel()
                }, {
                    id : 'setting',
                    name : this._t.setting_title,
                    viewHtml : this.app_data.templates['tpl_tab_setting'],
                    viewModel : this.getSettingViewModel()
                }]
            }
        };
    },
    getPostViewModel : (options) => {
        var that = this;
        return (function() {
            var postViewModel = function (options) {
                this._t = that._t;
                this._m = that._m;
                this.ownerId = that.me.branding.ed_user_id;
                this.http = that.http;
                this.postForm = {
                    content: '',
                    title: ''
                };
                this.selectForm = {
                    forum : null,
                    category : null,
                    account : null,
                    category_name : null,
                    category_url : null,
                    provider : null,
                    old_forum : null
                };
                this.selectedProviders = [];
                this.setting_time = false;
                this.master = {
                    forums : {
                        url : `${that.app_params.api_url}forum/master`,
                        mapping : {
                            'id' : 'domain',
                            'text' : 'name'
                        }
                    },
                    category : {
                        url : `${that.app_params.api_url}forum/category`,
                        mapping : {
                            'id' : '_id',
                            'text' : 'name'
                        }
                    },
                    accounts : {
                        url : `${that.app_params.api_url}forum/setting/${that.me._id}`,
                        mapping : {
                            'id' : 'username',
                            'text' : 'username'
                        }
                    }
                };
                this.forumChanged = (evt) => {
                    var value = (evt.detail || {}).value;
                    if (value && value.domain) {
                        this.selectForm.provider = value.provider;
                        this.master.category.url = `${that.app_params.api_url}forum/category?domain=${value.domain}`;
                        this.master.accounts.url = `${that.app_params.api_url}forum/setting/${that.me._id}?&domain=${value.domain}&is_error=0`;
                    } else {
                       this.resetSelectForm();
                    }

                    if (!value || (value.domain !== this.selectForm.old_forum && this.selectForm.old_forum)) {
                        that.utils.fireEvent('app-forum-category', { chooser : null }, 'mdeautocompletev2');
                        that.utils.fireEvent('app-forum-account', { chooser : null }, 'mdeautocompletev2');
                        this.selectForm.name = '';
                        this.selectForm.provider = '';
                        this.master.category.url = `${that.app_params.api_url}forum/category?domain=${null}`;
                        this.master.accounts.url = `${that.app_params.api_url}forum/setting/${that.me._id}?&domain=${null}&is_error=0`;
                    }

                    this.selectForm.old_forum = this.selectForm.forum;
                };

                this.categoryChanged = (evt) => {
                    var value = (evt.detail || {}).value;
                    if (value._id) {
                        this.selectForm.category = value._id;
                        this.selectForm.category_name = value.name;
                        this.selectForm.category_url = value.provider_data.post_url;
                        if (value.provider_data && value.provider_data.prefix_title) {
                            this.selectForm.prefixs = value.provider_data.prefix_title;
                        }
                    }
                };

                this.accountChanged = (evt) => {
                    var value = (evt.detail || {}).value;
                    if (value.username) {
                        this.selectForm.account = value.username;
                        this.selectForm.password = value.password;
                    }
                };

                this.selectProvider = () => {
                    if (!this.selectForm.forum || !this.selectForm.category || !this.selectForm.account) {
                        that.notify.notifier('Please fill all input field', 'warning');
                        return;
                    }
                    var exists = false;
                    for (var i = 0; i < this.selectedProviders.length; i++) {
                        var item = this.selectedProviders[i];
                        if (item && item.forum === this.selectForm.forum && item.category === this.selectForm.category && item.account === this.selectForm.account) {
                            exists = true;
                            break;
                        }
                    }
                    if (exists) {
                        that.notify.notifier('Provider selection exists', 'warning');
                        return;
                    }
                    this.selectedProviders.push(Object.assign({id : Date.now()}, this.selectForm));
                    this.resetSelectForm();
                };

                this.removeProvider = (id) => {
                    console.log('remove', this);
                    this.selectedProviders = this.selectedProviders.filter(p => p.id != id);
                };

                this.startChanged = (evt) => {
                    this.postForm.start = evt.detail.value;
                };

                this.post = () => {
                    if (this.selectedProviders.length === 0 ) {
                        that.notify.notifier('Please select provider');
                        return;
                    }

                    this.selectedProviders.forEach((provider, index) => {
                        let data = {
                            domain : provider.forum,
                        };
                        let provider_data = {
                            username : provider.account,
                            password : provider.password,
                            url : provider.category_url,
                            message : this.postForm.content,
                            title : this.postForm.title,
                            prefix_id : provider.prefix,
                            owner_id : this.ownerId
                        };
                        if (this.setting_time) {
                            data.start = this.postForm.start;
                            data.provider = 'post';
                            data.provider_data = provider_data;

                            that.http.post(`${that.app_params.api_url}forum/schedule/${that.me._id}`, data, 'POST').then(result => {
                                if (result && result.errors) {
                                    that.notify.notifier(`Schedule post to ${provider.category_url} failed.`, 'error');
                                }
                                if (index === this.selectedProviders.length -1) {
                                    that.notify.notifier('Schedule post success', 'success');
                                    this.getSchedulePosts();
                                }
                            });
                        } else {
                            data.provider_data = provider_data;
                            data.provider_data.user_id = that.me._id; // add user who posts data

                            var timeout = index * 15000;

                            setTimeout(() => {
                                that.http.post(`${that.app_params.api_url}forum/post`, data, 'POST').then(result => {
                                    if (result && result.errors) {
                                        that.notify.notifier(`Post to ${provider.forum} with profile ${provider.account} failed.`, 'error');
                                    }else{
                                        that.notify.notifier(`Post to ${provider.forum} with profile ${provider.account}  success`, 'success');
                                    }
                                });
                            }, timeout);
                        }
                    });
                };

                this.schedulePostNow = (schedule) => {
                    if (!schedule.domain) {
                        that.notify.notifier(`Provider is not valid`, 'error');
                        return;
                    }

                    let data = {
                        provider : schedule.domain,
                        provider_data : {
                            username : schedule.provider_data.account,
                            password : schedule.provider_data.password,
                            url : schedule.provider_data.category_url,
                            message : schedule.provider_data.message,
                            title : schedule.provider_data.message,
                            prefix_id : schedule.provider_data.prefix,
                            owner_id : schedule.provider_data.owner_id,
                            user_id : schedule.provider_data.user_id
                        }
                    };

                    that.http.post(`${that.app_params.api_url}forum/post`, data, 'POST').then(result => {
                        if (result && result.errors) {
                            that.notify.notifier(`Post to ${provider.forum} failed`, 'error');
                        }

                        if (index === this.selectedProviders.length -1) {
                            that.notify.notifier(this._m.post_success, 'success');
                        }
                    });
                };

                this.removeSchedule = (schedule) => {
                    that.http.fetch(`${that.app_params.api_url}forum/schedule/${that.me._id}?schedule_id=${schedule._id}`, 'DELETE').then(results => {
                        if (results && results.errors) {
                            that.errors.showServerErrors(results.errors);
                            return;
                        }
                        that.notify.notifier(this._m.remove_schdule_success, 'success');
                        this.getSchedulePosts();
                    });
                };
            };

            postViewModel.prototype.getSchedulePosts = function() {
                that.http.fetch(`${that.app_params.api_url}forum/schedule/${that.me._id}`).then(results => {
                    if (results && results.errors) {
                        return;
                    }
                    this.schedulePosts = results;
                });
            };

            postViewModel.prototype.refreshProfile = function(forum) {
                that.http.fetch(`${that.app_params.api_url}forum/setting/${that.me._id}?name=${forum}`).then(results => {
                    if (!results || results.errors) {
                        this.master.accounts.options = [];
                        return;
                    }
                    var options = results.map(profile => {
                        return { id: profile.provider_data.username, text: profile.provider_data.username }
                    });
                    this.master.accounts.options = options;
                });
            };

            postViewModel.prototype.resetSelectForm = function() {
                this.selectForm = {
                    forum: null,
                    category: null,
                    account: null,
                    category_name: null,
                    category_url: null,
                    provider: null,
                    prefixs: null,
                    prefix: null
                };
                this.master.category.url = `${that.app_params.api_url}forum/category?domain=${null}`;
                this.master.accounts.url = `${that.app_params.api_url}forum/setting/${that.me._id}?&domain=${null}&is_error=0`;
                that.utils.fireEvent('app-forum-category', { chooser : null }, 'mdeautocompletev2');
                that.utils.fireEvent('app-forum-account', { chooser : null }, 'mdeautocompletev2');
            };

            postViewModel.prototype.resetPostForm = function() {
                this.postForm = {
                    start: null,
                    title: '',
                    content: ''
                };
            };

            postViewModel.prototype.activate = function(options) {
                this.getSchedulePosts();
            };

            return new postViewModel(this);

        }).call(this);
    },
    getSettingViewModel : (options) => {
        var that = this;

        return (() => {
            var settingViewModel = function(options) {
                var rolesMapping = {
                    'agent': 'agent',
                    'admin': 'agent-admin',
                    'owner': 'agent-admin-owner'
                };
                this._t = that._t;
                this._m = that._m;
                this.http = that.http;
                this.utils = that.utils;
                this.ownerId = that.me.branding.ed_user_id;
                this.forums = [];
                this.master = {
                    forum : {
                        url : `${that.app_params.api_url}forum/master`,
                        mapping: {
                            'id' : 'domain',
                            'text' : 'name'
                        }
                    },
                    profile : {
                        url :  `${that.app_params.api_url}forum/setting/${that.me._id}`,
                        mapping : {
                            'id' : 'username',
                            'text' : 'username'
                        }
                    },
                    user: {
                        url: `people/user?role=${rolesMapping[that.me.roles[0]]}`,
                        mapping: {
                            "id": "_id",
                            "text": "name"
                        }
                    }
                };
                this.options = {
                    url : `${that.app_params.api_url}forum/master`,
                    mapping : {
                        'id' : 'domain',
                        'text' : 'name'
                    }
                }
                this.filter = {
                    forum : null,
                    profile : null,
                    is_error : false
                };
                this.pageSize = 5;
                this.importProfile = {
                    file : null,
                    accept : 'text/csv, application/vnd.ms-excel, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                };
                this.fileChanged = (evt) => {
                    console.log(evt);
                }
                this.searchChanged = (evt, type) => {
                    var value = (evt.detail || {}).value;
                    if (type === 'forum') {
                        if (!value) {
                            this.filter.forum = null;
                        }
                        if ((!this.filter.forum && value) || (value && value.domain !== this.filter.forum)) {
                            this.filter.forum = value.domain;
                        }
                    }
                    if(type == 'user'){
                        if(!value){
                            this.filter.user = null;
                        }
                        if((!this.filter.user && value) || (value && value._id != this.filter.user)){
                            this.filter.user = value._id;
                        }
                    }

                    this.getData();
                };

                this.canEdit= (forum)=>{
                    return !forum.user_id || forum.user_id == that.me._id;
                };

                this.add = ()=>{
                    this.forums.push({
                        id : Date.now(),
                        domain : this.filter.forum || '',
                        username : '',
                        password : ''
                    })
                };


                this.save = async (forum) => {
                    var url = `forum/setting/${that.me._id}`;
                    var method = forum._id ? 'PUT' : 'POST';

                    if (forum._id) {
                        url = `${url}?setting_id=${forum._id}`;
                    } else {
                        url = `${url}?owner_id=${this.ownerId}`; // set owner id for new account
                    }

                    var result = await this.http.post(url, forum, method, that.app_params.api_url);
                    if (result && result.errors) {
                        if (result.errors.user_id_1_domain_1_username_1_password) {
                            that.notify.notifier('Setting exists');
                        } else {
                            that.notify.notifier('Save setting forum failured');
                        }

                        return;
                    }

                    forum.domain = result.domain;
                    forum.username = result.username;
                    forum.password = result.password;
                    forum._id = result._id;
                    forum.add_time = result.add_time;

                    if(this.filter.is_error){
                        this.getData(0, this.forums.length);
                    }
                    this.forums = _.orderBy(this.forums, ['add_time'], ['desc']);
                    that.notify.notifier('Save setting forum success', 'success');
                };

                this.confirmRemove = (forum) => {
                    this.currentDelete = forum;
                    this.isShowConfirmDelete = true;
                };

                this.closePopup = () => {
                    this.currentDelete = null;
                    this.isShowConfirmDelete = false;
                };

                this.remove = (forum) => {
                    if (forum._id) {
                        var url = `${that.app_params.api_url}forum/setting/${that.me._id}?setting_id=${forum._id}`;
                        this.http.fetch(url, 'DELETE').then(result => {
                            if (result && result.errors) {
                                that.notify.notifier('Delete setting forum failured');
                                console.log(result.errors);
                                return;
                            }
                            _.remove(this.forums, ['_id', forum._id]);
                            that.notify.notifier('Delete setting forum success', 'success');
                            this.currentDelete = null;
                            this.isShowConfirmDelete = false;
                        });
                    } else {
                        _.remove(this.forums, ['id', forum.id]);
                        this.currentDelete = null;
                        this.isShowConfirmDelete = false;
                    }
                };

                this.keyChanged = (evt, item) => {
                    if (!item.id) {
                        return;
                    }
                    var input = document.getElementById(`forum-${item.id}`);
                    var value = (evt.detail || {}).value;
                    if (_.find(this.items, (o) => { return value && o.domain === value.domain && o.id !== item.id; })) {
                        that.errors.showErrorsForInput(input , ['manage_app.forum_exists']);
                        item.key = null;
                    } else {
                        that.errors.resetFormGroup(input.parentNode);
                    }
                };

                this.addProfile = (forum) => {
                    if (!forum) { return; }
                    forum.profiles.push({ username : '', password : '' });
                };

                this.removeProfile = (forum, index) => {
                    if (!forum) { return; }
                    console.log('index', index);
                    _.pullAt(forum.profiles, [index]);
                };

                this.showImportPopup = () => {
                    this.isShowImport = true;
                }

                this.cancelImport = () => {
                    this.importProfile.file = null;
                    this.isShowImport = false;
                }


                this.importExcute = () => {
                    var url = `${that.app_params.api_url}forum/setting-import/${that.me._id}`;
                    this.http.postFormData(url, { import : this.importProfile.file, owner_id : this.ownerId }, 'POST').then(results => {
                        if (results && results.errors) {
                            that.errors.showServerErrors(results.errors);
                            return;
                        }
                        this.importProfile.file = null;
                        this.isShowImport = false;
                        if(this.forums.length < this.pageSize){
                            this.getData();
                        }

                        that.notify.notifier(this._m.import_success, 'success');
                    });
                }

                this.activate = () => {
                    this.getData();
                };

                this.getData = (skip, limit)=>{
                    var url =  `forum/setting/${this.filter.user || that.me._id}?_=`;

                    if((that.me.roles[0] == 'admin' || that.me.roles[0] == 'owner') && !this.filter.user){
                        url = `${url}&owner_id=${this.ownerId}`
                    }

                    limit = limit || this.pageSize;

                    if (skip) {
                        url = `${url}&skip=${skip}`;
                    }

                    if (limit) {
                        url = `${url}&limit=${limit + 1}`;
                    }

                    if (this.filter.forum) {
                        url = `${url}&domain=${this.filter.forum}`;
                    }

                    if (this.filter.profile) {
                        url = `${url}&name=${this.filter.profile}`;
                    }

                    if (this.filter.is_error) {
                        url = `${url}&is_error=${this.filter.is_error? 1: 0}`;
                    }

                    this.http.fetch(url, 'GET', that.app_params.api_url).then(results => {
                        if (results && results.errors) {
                            console.log(results.errors);
                            return;
                        }

                        if (results.length > limit) {
                            results.pop();
                            this.canLoadMore = true;
                        } else {
                            this.canLoadMore = false;
                        }

                        // set id to each item
                        results.forEach(item => {
                            item.id = Date.now();
                        });

                        if (skip) {
                            this.forums = this.forums.concat(results);
                        } else {
                            this.forums = results;
                        }

                        if (this.forums.length === 0) {
                            this.forums.push({
                                id : Date.now(),
                                domain : this.filter || '',
                                username : '',
                                password : ''
                            });
                        }
                    });
                };
            };

            return new settingViewModel(this);

        }).call(this);
    }
}
