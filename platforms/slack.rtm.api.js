const util = require('util');
const BotanalyticsUtil = require("../util");

module.exports = function(token, userConfig) {

    // Check token
    if (!token || token.constructor !== String)
        throw new Error('You must provide a Botanalytics token!');

    // Merge user configuration into the default config
    const config = Object.assign({
        baseUrl: 'https://api.botanalytics.co/v1/',
        debug: false
    }, userConfig);

    const log = new BotanalyticsUtil.Logger(config);

    log.debug('Logging enabled.');

    log.debug('Configuration: ' + util.inspect(config));

    // Configure request defaults
    const request = require('request').defaults({
        baseUrl: config.baseUrl,
        headers: {
            'Authorization': 'Token ' + encodeURIComponent(token),
            'Content-Type': 'application/json'
        }
    });

    return {

        attach: (rtm, callback) => {

            // Check rtm object
            if (!rtm) {

                const err = new Error('You must provide a RTM object!');

                if (callback)
                    return callback(err);
                else
                    return err;
            }

            new BotanalyticsUtil.SlackFetcher(token, rtm._token, config).fetch();

            this.rtmRef = rtm;
            this.rtmRef.originalUpdateMessage = rtm.updateMessage;
            this.rtmRef.updateMessage = function(message,optCb){

                log.debug('Logging message update:'+message.text);

                this.rtmRef.originalUpdateMessage(message, optCb);

                const payload = {
                    message : {
                        type:'message',
                        channel : message.channel,
                        text : message.text,
                        user : this.activeUserId,
                        ts : (new Date().getTime() / 1000) + "",
                        team : this.activeTeamId,
                        isBot: true
                    }
                };

                request({

                    url: '/messages/slack/',
                    method: 'POST',
                    json: true,
                    body: payload

                }, (err, resp, payload) => {

                    if (err) {

                        log.error('Failed to log outgoing message.', err);

                        if (callback)
                            callback(new Error('Failed to log outgoing message'));

                        return;
                    }

                    err = log.checkResponse(resp, 'Successfully logged outgoing message.', 'Failed to log outgoing message.');

                    if (callback)
                        callback(err);
                });
            };

            this.rtmRef.originalSendTyping = rtm.sendTyping;

            this.rtmRef.sendTyping = function (channelId) {
                log.debug("Sending 'typing' message to channel:"+channelId);
                this.rtmRef.originalSendTyping(channelId);
                const payload = {
                    message : {
                        type: "typing",
                        text: "",
                        channel : channelId,
                        user : this.activeUserId,
                        ts : (new Date().getTime() / 1000) + "",
                        team : this.activeTeamId,
                        isBot: true
                    }
                };

                request({

                    url: '/messages/slack/',
                    method: 'POST',
                    json: true,
                    body: payload

                }, (err, resp, payload) => {

                    if (err) {

                        log.error('Failed to log outgoing message.', err);

                        if (callback)
                            callback(new Error('Failed to log outgoing message'));

                        return;
                    }

                    err = log.checkResponse(resp, 'Successfully logged outgoing message.', 'Failed to log outgoing message.');

                    if (callback)
                        callback(err);
                });
            };
            
            this.rtmRef.originalSendMessage = rtm.sendMessage;

            this.rtmRef.sendMessage = function(text, channel, cb) {

                log.debug('Logging outgoing message: ' + text);

                this.originalSendMessage(text,channel,cb);

                const payload = {
                    message: {
                        type: "message",
                        channel: channel,
                        text : text,
                        user: this.activeUserId,
                        ts: (new Date().getTime() / 1000) + "",
                        team: this.activeTeamId,
                        isBot : true
                    }
                };

                request({

                    url: '/messages/slack/',
                    method: 'POST',
                    json: true,
                    body: payload

                }, (err, resp, payload) => {

                    if (err) {

                        log.error('Failed to log outgoing message.', err);

                        if (callback)
                            callback(new Error('Failed to log outgoing message'));

                        return;
                    }

                    err = log.checkResponse(resp, 'Successfully logged outgoing message.', 'Failed to log outgoing message.');

                    if (callback)
                        callback(err);
                });
            };

            // Attach to message event
            rtm.on('message', (message) => {

                log.debug('Logging incoming message: ' + util.inspect(message));

                request({

                    url: '/messages/slack/',
                    method: 'POST',
                    json: true,
                    body: {
                        message: Object.assign({isBot:false}, message)
                    }

                }, (err, resp, payload) => {

                    if (err) {

                        log.error('Failed to log incoming message.', err);

                        if (callback)
                            callback(new Error('Failed to log incoming message'));

                        return;
                    }

                    err = log.checkResponse(resp, 'Successfully logged incoming message.', 'Failed to log incoming message.');

                    if (callback)
                        callback(err);
                });
            });
        }
    };
};