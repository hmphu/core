'use strict';
/**
 * Module dependencies.
 */
var youtube_channel_policy = require('../policies/youtube.policy'),
    youtube_channel = require('../controllers/youtube.channel.controller');

module.exports = (app) => {
    // collection routes    
    app.route('/api/youtube/channel').all(youtube_channel_policy.isAllowed)
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.list)
        .post(youtube_channel_policy.permissionFeatures, youtube_channel.add);
    
    app.route('/api/youtube/channel/count').all(youtube_channel_policy.isAllowed)
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.count);

    app.route('/api/youtube/channel/authorize').all(youtube_channel_policy.isAllowed)
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.authorize);

    app.route('/api/youtube/channel/authorize/callback')
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.callback);

    app.route('/api/youtube/channel/authorize/subscribe')
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.subscribe);
    
    app.route('/api/youtube/channel/:youtube_channel_id').all(youtube_channel_policy.isAllowed)
        .get(youtube_channel_policy.permissionFeatures, youtube_channel.read)
        .put(youtube_channel_policy.permissionFeatures, youtube_channel.update)
        .delete(youtube_channel_policy.permissionFeatures, youtube_channel.delete);
    
    app.route('/api/youtube/channel/:youtube_channel_id/toggle').all(youtube_channel_policy.isAllowed)
        .put(youtube_channel_policy.permissionFeatures, youtube_channel.toggle); //active or deactive
        
    // Finish by binding middleware
    app.param('youtube_channel_id', youtube_channel.youtubeChannelByID);
};
