'use strict';

var koa = require('koa');
var bodyParser = require('koa-body-parser');
var mount = require('koa-mount');
var path = require('path');
var handlebars = require("koa-handlebars");
var router = require('koa-router');
var serve = require('koa-static');
var fse = require('fs-extra');

var Validator = require('validator.js');
var request = require('request');
var Q = require('q');
var captcha = require('ascii-captcha');
var session = require('koa-session');

var app = koa();

app.keys = ['secret for github-agent'];
app.use(session(app));

var lib = require('./lib/');

var repo = 'USER/REPO';
var token = 'TOKEN';

app.use(bodyParser());

app.use(handlebars({
  defaultLayout: "index",
  layoutsDir: "app/layouts",
  viewsDir: "app/views",
  partialsDir: "app/partials",
  helpers: {
    json: function (obj) {
            return JSON.stringify(obj);
          }
  }
}));

app.use(router(app));
var pub = new router();

var Assert = Validator.Assert;
var validator = new Validator.Validator();

pub.get('/', function *(next) {
  yield this.render("index", {
    title: "Test Page",
    name: "World"
  });
});

pub.post('/captcha', function *(next) {
  var text = captcha.generateRandomText(5);

  this.session.captcha = text;
  this.body = captcha.word2Transformedstr(text);
});

pub.post('/send', function *(next) {
  if(this.session.captcha === this.request.body.captcha) {
    console.log('yes');
    var deferred = Q.defer();
    var that = this;

    var object = {
      name: this.request.body.name,
      email: this.request.body.email,
      title: this.request.body.title,
      text: this.request.body.text
    };

    var constraint = {
      name: [
        new Assert().NotBlank(),
        new Assert().Length({ min: 4, max: 25 })
      ],
      email: new Assert().Email(),
      title: [
        new Assert().NotBlank(),
        new Assert().Length({ min: 5 })
      ],
      text: [
        new Assert().NotBlank(),
        new Assert().Length({ min: 10 })
      ]
    };

    if(validator.validate(object, constraint)) {

      request.post({
        headers: { 'User-Agent': 'github-agent', 'Authorization': 'token ' + token, 'Content-type': 'application/json' },
        url: 'https://api.github.com/repos/' + repo + '/issues',
        json: {
          "title" : this.request.body.title,
          "body" : this.request.body.text
        }
      }, function(err, httpResponse, body) {
        if(err) {
          deferred.reject(403);
        } else {
          fse.appendFile('app/data.txt', that.request.body.email + ',' + body.number + ',' + body.state + '\n', function (err) {
            deferred.resolve(201);
          });
        }
      });

      this.body = yield deferred.promise;
    } else {
      this.body = JSON.stringify(vali);
    }
  } else {
    this.body = 403;
  }
});

app.use(mount('/static', app.use(serve(__dirname + '/static'))));
app.use(mount('/bower_components', app.use(serve(__dirname + '/bower_components'))));
app.use(mount('/', pub.middleware()));

app.listen(8000);