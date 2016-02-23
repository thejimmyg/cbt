'use strict'

var fs = require('fs');
var path = require('path');
var sanitize = require("sanitize-filename");

var myHooks = function () {

  // In registerHandler we can't get this, so we set self here and assign it in After
  var self;
  var failed = false;

  this.Before(function(scenario, callback) {
    self = this;
    console.log('[test.runner] =============', scenario.getName(), '=============');
    if (self.platform === 'IE' || self.platform === 'IOS'){
      callback();
    } else {
      self.driver.manage().logs().get('browser').then(function(text) {
        console.log('[browser.log]', text);
        callback();
      });
    }
  });

  this.After(function(scenario, callback) {
    console.log('[test.runner] Finished "' + scenario.getName() + '" scenario.');
    if(scenario.isFailed()) {
      failed = true;
      self.driver.takeScreenshot().then(function(data){
        var base64Data = data.replace(/^data:image\/png;base64,/,"");
        var screenshotPath = path.join('screenshots', sanitize(scenario.getName() + ".png").replace(/ /g,"_"));
        fs.writeFile(screenshotPath, base64Data, 'base64', function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log('[test.runner] Saved screenshot:', screenshotPath);
            }
        });
      });
    }
    var logBrowserLogs = function() {
      if (self.platform === 'IE' || self.platform === 'IOS'){
        callback();
      } else {
        self.driver.manage().logs().get('browser').then(function(text) {
          console.log('[browser.log]', text);
          callback();
        });
      }
    };
    if (self.platform === 'IE' || self.platform === 'IOS'){
      callback();
    } else {
      logBrowserLogs();
    }
  });

  this.registerHandler('AfterFeatures', function (event, callback) {
    if (typeof self === 'undefined') {
      console.log('No tests run - You\'ll need to quit the browser manually');
      return callback();
    }
    if (failed) {
      console.error('Failed.');
    }
    var cleanup = function() {
      if (typeof self.mainDriver !== 'undefined') {
        self.mainDriver.quit();
      }
      if (typeof self.adminDriver !== 'undefined') {
        self.adminDriver.quit();
      }
      if (self.server.length) {
         self.server[0].finish(function() {
           self.server.pop();
           console.log('[test.runner] Complete.');
           callback();
         });
      } else {
        console.log('[test.runner] Complete.');
        callback();
      }
    };
    if (self.platform === 'IE' || self.platform === 'IOS'){
      cleanup();
    } else {
      self.driver.manage().logs().get('browser').then(function(text) {
        console.log('[browser.log]', text);
        cleanup();
      });
    }
  });

};

module.exports = myHooks;
