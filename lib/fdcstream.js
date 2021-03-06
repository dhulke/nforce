var util   = require('util');
var events = require('events');
var bayeuxjs   = require('bayeuxjs');

function Subscription(opts, client) {
  var self = this;
  this.client = client;
  opts = opts || {};

  events.EventEmitter.call(this);

  if(opts.channel) {
    this._topic = opts.channel;
  } else if (opts.isCdc) {
    this._topic = '/data/' + opts.topic;
  } else if(opts.isSystem) {
    this._topic = '/systemTopic/' + opts.topic;
  } else if (opts.isEvent) {
    this._topic = '/event/' + opts.topic;
  } else {
    this._topic = '/topic/' + opts.topic;
  }

  if(opts.replayId) {
    client.addReplayId(this._topic, opts.replayId);
  }

  this._sub = client._fayeClient.subscribe(this._topic, function(d) {
    self.emit('data', d);
    client.addReplayId(self._topic, d.event.replayId);
  });

  this._sub.callback(function(){
    self.emit('connect');
  });

  this._sub.errback(function(err) {
    self.emit('error', err);
  });
}

util.inherits(Subscription, events.EventEmitter);

Subscription.prototype.cancel = function() {
  if(this._sub) this._sub.cancel();
};

function AsyncCallbackSubscription(opts, client) {
  var self = this;
  this.client = client;
  opts = opts || {};

  events.EventEmitter.call(this);

  if(opts.channel) {
    this._topic = opts.channel;
  } else if (opts.isCdc) {
    this._topic = '/data/' + opts.topic;
  } else if(opts.isSystem) {
    this._topic = '/systemTopic/' + opts.topic;
  } else if (opts.isEvent) {
    this._topic = '/event/' + opts.topic;
  } else {
    this._topic = '/topic/' + opts.topic;
  }

  if(opts.replayId) {
    client.addReplayId(this._topic, opts.replayId);
  }

  function onLastEvent(lazyConnectCallback) {
    self.emit('lastevent', lazyConnectCallback);
  }

  this._sub = client._fayeClient.subscribeWithLazyConnect(this._topic, function(d) {
    self.emit('data', d);
    client.addReplayId(self._topic, d.event.replayId);
  }, onLastEvent);

  this._sub.callback(function(){
    self.emit('connect');
  });

  this._sub.errback(function(err) {
    self.emit('error', err);
  });
}

util.inherits(AsyncCallbackSubscription, events.EventEmitter);

// Client definition

function Client(opts) {
  var self = this;
  opts = opts || {};

  events.EventEmitter.call(this);

  this._endpoint = opts.oauth.instance_url + '/cometd/' + opts.apiVersion.substring(1);
  this._fayeClient = new bayeuxjs.Client(this._endpoint, {
    timeout: opts.timeout,
    retry: opts.retry
  });
  this._fayeClient.setHeader('Authorization', 'Bearer ' + opts.oauth.access_token);

  this._fayeClient.on('transport:up', function() {
    self.emit('connect');
  });

  this._fayeClient.on('transport:down', function() {
    self.emit('disconnect');
  });

  this._replayFromMap = {};

  var client = this;
  var replayExtension = {
    outgoing: function(message, callback) {
      if (message.channel === '/meta/subscribe') {
        if (!message.ext) { message.ext = {}; }
        message.ext['replay'] = client._replayFromMap;
      }
      callback(message);
    }
  };
  this._fayeClient.addExtension(replayExtension);
}

util.inherits(Client, events.EventEmitter);

Client.prototype.subscribe = function(opts) {
  opts = opts || {};
  return new Subscription(opts, this);
};

Client.prototype.subscribeAsync = function(opts) {
  opts = opts || {};
  return new AsyncCallbackSubscription(opts, this);
};

Client.prototype.disconnect = function(opts) {
  this._fayeClient.disconnect();
};

Client.prototype.addReplayId = function(topic, replayId) {
  this._replayFromMap[topic] = replayId;
};

module.exports.AsyncCallbackSubscription = AsyncCallbackSubscription;
module.exports.Subscription = Subscription;
module.exports.Client       = Client;
