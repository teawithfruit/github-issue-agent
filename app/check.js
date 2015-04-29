'use strict';

var fse = require('fs-extra');
var request = require('request');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var Q = require('q');

var issueFile = 'data.txt';
var repo = 'USER/REPO';
var token = 'TOKEN';

var emailFrom = 'from@email.com';
var transporter = nodemailer.createTransport(smtpTransport({
    host: 'SMTP',
    port: 25,
    auth: {
      user: 'USER',
      pass: 'PASSWORD'
    }
}));

var getIssue = function(issue) {
  var deferred = Q.defer();

  request.get({
    headers: { 'User-Agent': 'github-agent', 'Authorization': 'token ' + token, 'Content-type': 'application/json' },
    url: 'https://api.github.com/repos/' + repo + '/issues/' + issue[1]
  }, function(err, httpResponse, body) {
    if(err) {
      deferred.reject(err);
    } else {
      body = JSON.parse(body);
      body.fic2user = issue[0];

      deferred.resolve(body);
    }
  });

  return deferred.promise;
};

var readline = function(thePath, splitter) {
  var deferred = Q.defer();
  var result = [];

  fse.readFile(thePath, 'utf8', function (err, data) {
    var array = data.toString().split('\n');

    array.forEach(function(tupel) {
      if(tupel != '') {
        result.push(tupel.split(splitter));
      }
    });

    deferred.resolve(result);
  });

  return deferred.promise;
};

readline(issueFile, ',')
.then(function(d) {
  var deferred = Q.defer();

  var result = {};
  var promises = [];

  d.forEach(function(issue) {
    if(issue[2] != 'closed') {
      promises.push(getIssue(issue));
    }
  });

  Q.allSettled(promises)
  .then(function(p) {
    
    p.forEach(function(tupel) {
      result[tupel.value.number] = [tupel.value.fic2user, tupel.value.number, tupel.value.state];
    });
    
    deferred.resolve(result);
  });

  return deferred.promise;
})
.then(function(d) {
  var deferred = Q.defer();

  for(var index in d) {
    
    if(d[index][2] == 'closed') {
      var mailOptions = {
        from: emailFrom,
        to: d[index][0],
        subject: 'Issue closed',
        html: 'Your <a href="https://github.com/' + repo + '/issues/' + d[index][1] + '">issue</a> have been closed.'
      };

      transporter.sendMail(mailOptions, function(error, info) {
        if(error) {
          console.log(error);
          deferred.reject(error);
        } else {
          deferred.resolve(d);
        }
      });
      
    }
  }

  return deferred.promise;
})
.then(function(d) {
  fse.readFile(issueFile, 'utf8', function(err, data) {
    if(err) return console.log(err);

    for(var index in d) {
      if(d[index][2] == 'closed') {
        var toReplace = d[index][0] + ',' + d[index][1] + ',open';
        var re = new RegExp(toReplace, "g");

        data = data.replace(re, d[index].toString());
      }
    }
    
    fse.writeFile(issueFile, data, 'utf8', function (err) {
       if(err) return console.log(err);
    });
  });
});