{
    search : (searchResponse) => {
//      console.log('search %s', this.currentRequesterId);
        
        var query = encodeURIComponent(`requester:${this.currentRequesterId} sort:-created`);

        var data = `type=tickets&skip=${searchResponse.skip}&limit=${searchResponse.limit}&query=${query}`;
        
        var tasks = [];
        tasks.push(this.http.fetch(`search?${data}`));
        tasks.push(this.http.fetch(`people/user/${this.currentRequesterId}`));
        tasks.push(this.http.fetch(`people/user/${this.currentRequesterId}/contacts`));
        if (typeof searchResponse.total === 'undefined') {
            tasks.push(this.http.fetch(`search?${data}&count=true`));
        }

        Promise.all(tasks).then(values => {
            var ticketResults = values[0] || [];
            var requester = values[1] || {};
            var contacts = values[2];
            var total = parseInt(values[3]);
           
            if (ticketResults.errors || requester.errors || (contacts && contacts.errors) || (total && total.errors)) {
                return;
            }
            
            searchResponse.total = isNaN(total) ? searchResponse.total : total;

            searchResponse.results = searchResponse.results.concat(ticketResults);

            var skip = searchResponse.results[searchResponse.results.length - 1] && searchResponse.results[searchResponse.results.length - 1].add_time || undefined;
            searchResponse.skip = skip;

            this.hasMore = searchResponse.results.length < searchResponse.total;
            
            this.requester = requester;
            this.contacts = contacts;
        });
    },
    refresh : () => {
        this.searchResponse = {
            results : [],
            total : undefined,
            skip : undefined,
            limit : this.app_params.page_size
        };

        this.requester = {};

        this.contacts = {};

        this.currentRequesterId = this.ticket.requester_id;

        this.search(this.searchResponse);
    },
    more : () => {
        this.search(this.searchResponse);
    },
    ticketChanged : (newValue) => {
        this.ticket = newValue || {};
        this.changedToggled();
    },
    changedToggled : () => {
        if (!this.ticket.requester_id || this.currentRequesterId === this.ticket.requester_id) {
            return;
        }

        this.refresh();
    },
    toLocaleDateString : (timestamp) => {
        return new Date(timestamp).toLocaleDateString();
    },
    hasMore : false
}
