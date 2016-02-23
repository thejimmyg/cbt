'use strict';

var expect = require('chai').expect;
var url = require('url');
var querystring = require('querystring');
var child_process = require('child_process');
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

var webdriver = require('selenium-webdriver');

var platform = process.env.PLATFORM || "CHROME";

module.exports = function() {
  this.World = require('../support/world.js').World;
  var steps = this;

  var first = true;
  var capturedContent = null;
  var extras = {
    cmdOutput: null,
    cmdError: null,
    lastCmd: null,
  }

  steps.When(/^I run this command:$/, function (command, callback) {
    extras.lastCmd = command;
    console.error(command)
    child_process.exec(command, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      extras.cmdOutput = stdout;
      extras.cmdError = stderr;
      callback();
    })
  });
  

  steps.Then(/^the following is present in the output:$/, function (string, callback) {
    // Write code here that turns the phrase above into concrete actions
    if (extras.cmdOutput.indexOf(string) === -1) {
      throw 'Did not find "'+string+'" in '+extras.cmdOutput+'\n\nCommand was:\n'+extras.lastCmd;
    }
    callback();
  });

  steps.Then(/^'(.*)' is present in the output$/, function (string, callback) {
    // Write code here that turns the phrase above into concrete actions
    if (extras.cmdOutput.indexOf(string) === -1) {
      throw 'Did not find "'+string+'" in '+extras.cmdOutput+'\n\nCommand was:\n'+extras.lastCmd;
    }
    callback();
  });

  steps.Then(/^this test is skipped$/, function (callback) {
    callback.pending();
  });

  steps.Then(/^the browser is still at this URL with the captured content substituted: \/(.*)$/, function(path, callback) {
    var dst =  ('/'+path).replace("${CAPTURED}", capturedContent)
    console.error('The URL is '+dst)
    return waitForBrowserToMoveTo(this, dst, callback);
  });

  steps.Then(/^the browser is still at \/(.*)$/, function (path, callback) {
    return waitForBrowserToMoveTo(this, '/'+path, callback);
  });

  var waitForBrowserToMoveTo = function(self, path, callback, subdomain) {
    if (subdomain) {
      var host = 'http://' + subdomain + '.localhost:8080';
    } else {
      var host = self.host;
    }
    return self.driver.wait(function() {
      return self.driver.getCurrentUrl().then(function(currentURL) {
        // console.error(currentURL, host+path, currentURL === host+path)
        return currentURL === host+path;
      });
    }, 2000).then(function() {
      callback();
    });
  };

  steps.Then(/^the browser moves to this URL with the captured content substituted: \/(.*)$/, function(path, callback) {
    var dst = ('/'+path).replace("${CAPTURED}", capturedContent)
    console.log('URL with ${CAPTURED} replaced: '+dst)
    waitForBrowserToMoveTo(this, dst, callback);
  });
  steps.Then(/^the browser moves to \/(.*)$/, function (path, callback) {
    waitForBrowserToMoveTo(this, '/'+path, callback);
  });

  steps.Then(/^the browser moves to \/(.*) or \/(.*)$/, function (path1, path2, callback) {
    var self = this;
    this.driver.getCurrentUrl().then(function(currentURL) {
      expect(currentURL).to.satisfy(function(currentURL) {
        if (currentURL === self.host+'/'+path1 || currentURL === self.host+'/'+path2) {
          return true;
        }
        return false;
      });
      callback();
    });
  });

  var waitForBrowserToMoveToIgnoringQuery = function(self, path, callback, subdomain) {
    if (subdomain) {
      var host = 'http://' + subdomain + '.localhost:8080';
    } else {
      var host = self.host;
    }
    return self.driver.wait(function() {
      return self.driver.getCurrentUrl().then(function(currentURL) {
        return currentURL.indexOf(host+path+'?') === 0;
      });
    }, 2000).then(function() {
      callback();
    });
  };

  steps.Then(/^the browser moves to \/(.*)\?\.\.\.$/, function (path, callback) {
    waitForBrowserToMoveToIgnoringQuery(this, '/'+path, callback);
  });

  var followLink = function(self, text, callback) {
    self.driver.findElement({linkText: text}).then(function(elem) {
      elem.click();
      callback();
    });
  }

  steps.When(/^I follow the '(.*)' link$/, function (text, callback) {
    followLink(this, text, callback);
  });

  var followLinkInElement = function(self, text, cssLocator, callback) {
    self.driver.findElement(webdriver.By.css(cssLocator)).then(function(elem) {
      elem.findElement({linkText: text}).then(function(elem) {
        elem.click();
        callback();
      });
    });
  }

  steps.When(/^I follow the '(.*)' link in '(.*)'$/, function (text, selector, callback) {
    followLinkInElement(this, text, selector, callback);
  });

  steps.When(/^I wait forever$/, function (callback) {
    console.error('Waiting forever');
    console.log('Waiting forever');
    // We don't call the callback, so cucumber waits forever
  });

  steps.When(/^I refresh the browser$/, function (callback) {
    var navigate = new webdriver.WebDriver.Navigation(this.driver);
    navigate.refresh().then(function(){
      callback();
    });
  });

  var moveBrowser = function(self, path, callback, subdomain) {
    if (subdomain) {
      var host = 'http://' + subdomain + '.localhost:8080';
    } else {
      var host = self.host;
    }
    var get = function(path) {
      console.log('Going to', host+path);
      self.driver.getCurrentUrl().then(function(currentURL) {
        // console.error(currentURL, host, path);
        if (currentURL === host+path) {
          self.driver.get(host+'/start').then(function() {
            self.driver.get(host+path).then(function() {
              callback();
            });
          });
        } else {
          self.driver.get(host+path).then(function() {
            if (platform === 'IE') {
              setTimeout(callback, 1000);
            } else {
              callback();
            }
          });
        }
      });
    }.bind(self);
    if (platform === 'IOS' && first) {
      first = false;
      console.error('Waiting 20 seconds for iOS to boot Safari ...')
      setTimeout(
        function(){
          console.error('Waited. Now let\'t try the tests.'),
          get(path);
        },
        20000
      );
    } else {
      get(path);
    }
  };

  steps.Given(/^the browser is at \/(.*)$/, function (path, callback) {
    console.error('Deprecated, use I navigate to');
    moveBrowser(this, '/'+path, callback);
  });

  steps.Given(/^I clear cookies$/, function (callback) {
    this.driver.manage().deleteAllCookies().then(function(){
      callback()
    });
  });

  // Must come before the other regex after it or the wrong thing gets matched
  steps.Then(/^I navigate to this URL with the captured content substituted: \/(.*)$/, function(path, callback) {
    var dst =  ('/'+path).replace("${CAPTURED}", capturedContent)
    console.error('The URL is '+path);
    console.log('The DST is '+dst);
    moveBrowser(this, dst, callback);
  });
  steps.Then(/^I navigate to this URL with the captured content appended: \/(.*)$/, function(path, callback) {
    console.error('The URL is '+path+capturedContent);
    console.log('The URL is '+path+capturedContent);
    moveBrowser(this, '/'+path+capturedContent, callback);
  });

  steps.Given(/^I navigate to \/(.*)$/, function (path, callback) {
    moveBrowser(this, '/'+path, callback);
  });

  steps.When(/^I have waited ([\.\d]+) second\(s\)$/, function (secs, callback) {
    setTimeout(
      callback,
      secs * 1000
    );
  });

  steps.When(/^the content of '(.*)' is captured$/, function (cssSelector, callback) {
    var self = this;
    self.waitFor(cssSelector, 2000, function(html) {
      capturedContent = html;
      callback();
    });
  });

  steps.Then(/^the content of '(.*)' remains unchanged$/, function (cssSelector, callback) {
    var self = this;
    self.waitFor(cssSelector, 2000, function(html) {
      expect(capturedContent).to.not.equal(null);
      expect(capturedContent).to.equal(html);
      callback();
    });
  });

  steps.When(/^I click '(.*)'$/, function (cssSelector, callback) {
    var self = this;
    self.waitForElement(cssSelector, 2000, function(elem) {
      elem.click();
      callback();
    });
  });

  steps.Given(/^the hash is changed to '(.*)'$/, function (hash, callback) {
    var self = this;
    self.driver.executeScript('window.location.hash = "'+hash+'";').then(function(events) {
      callback();
    });
  });

  steps.Given(/^'(.*)' is visible in '(.*)'$/, function (text, cssSelector, callback) {
    this.waitForValue(cssSelector, 2000, text, callback);
  });

  steps.Given(/^'(.*)' is visible in '(.*)' within (.*) second\(s\)$/, function (text, cssSelector, timeout, callback) {
    this.waitForValue(cssSelector, timeout * 1000, text, callback);
  });

  var switchToAdminBrowser = function(self, callback) {
    self.driver = self.adminDriver;
    callback();
  }

  steps.When(/^I switch to the admin browser$/, function (callback) {
    // console.error('adminDriver', this.driver === this.adminDriver);
    switchToAdminBrowser(this, callback);
  });

  var switchToMainBrowser = function(self, callback) {
    self.driver = self.mainDriver;
    callback();
  }

  steps.When(/^I switch to the main browser$/, function (callback) {
    // console.error('mainDriver', this.driver === this.mainDriver);
    switchToMainBrowser(this, callback);
  });

  var clickButton = function(self, text, callback) {
    self.driver.findElement({xpath: "//input[@type='submit' and @value='"+text+"']"}).then(function(elem) {
      elem.click();
      callback();
    });
  };

  steps.When(/^I click the button labelled '(.*)'$/, function (text, callback) {
    clickButton(this, text, callback);
  });

  steps.Given(/^'(.*)' is not visible in '(.*)'$/, function (text, cssSelector, callback) {
    this.waitForNoValue(cssSelector, 1, text, callback);
  });

  steps.Given(/^'(.*)' is not visible in '(.*)' within (.*) second\(s\)$/, function (text, cssSelector, timeout, callback) {
    this.waitForNoValue(cssSelector, timeout * 1000, text, callback);
  });

  steps.Given(/^the following JSON is visible in '(.*)':$/, function (cssSelector, text, callback) {
    this.waitForJSON(cssSelector, 2000, JSON.parse(text), callback);
  });

  steps.Given(/^the JSON '(.*)' is visible in '(.*)'$/, function (text, cssSelector, callback) {
    this.waitForJSON(cssSelector, 2000, JSON.parse(text), callback);
  });

  steps.Given(/^the following JSON is visible in '(.*)' within (.*) second\(s\):$/, function (cssSelector, timeout, text, callback) {
    this.waitForJSON(cssSelector, timeout * 1000, JSON.parse(text), callback);
  });

  steps.Then(/^the console log shows:$/, function (string, callback) {
    if (platform !== 'CHROME') {
      callback.pending();
    } else {
      var self = this;
      self.driver.manage().logs().get('browser').then(function(log) {
        console.log(log);
        var asString = '';
        var msg, message;
        for (var i=0; i<log.length; i++) {
          msg = log[i].message.split(' ');
          message = msg.slice(2).join(' ');
          if (message !== 'Download the React DevTools for a better development experience: http://fb.me/react-devtools') {
            asString += message + '\n';
          }
        }
        expect(string+'\n').to.equal(asString);
        callback();
      });
    }
  });

  var typeInto = function(self, selector, data, callback) {
    self.waitForElement(selector, 5000, function(elem) {
      console.log(selector, elem);
      elem.clear();
      elem.sendKeys(data); //webdriver.Key.F11);
      callback();
    });
  };

  steps.Given(/^I have typed the following into (.*):$/, function (selector, data, callback) {
    typeInto(this, selector, data, callback);
  });

  steps.Given(/^I have typed '(.*)' into (.*)$/, function (data, selector, callback) {
    var self = this;
    self.waitForElement(selector, 2000, function(elem) {
      elem.clear();
      elem.sendKeys(data);
      callback();
    });
  });

  steps.When(/^I drag (.*) (.*)px to the right$/, function (selector, pixels, callback) {
    if (platform === 'SAFARI' || platform === 'IOS') {
      // Safari doesn't implement actions API
      callback.pending();
    } else {
      var self = this;
      self.waitForElement(selector, 2000, function(elem) {
        self.waitForElement('#description', 2000, function(relative) {
          console.log(elem);
          console.log(relative);
          new webdriver.ActionSequence(self.driver)
            .dragAndDrop(elem, {x: parseInt(pixels), y: 0})
            //.mouseDown(elem)
            //.mouseMove(2000, 0)
            //.mouseUp()
            .perform();
          callback();
        });
      });
    }
  });

  steps.When(/^I go back$/, function (callback) {
    if (platform === 'SAFARI') {
      // Safari doesn't support back and forward properly
      callback.pending();
    } else {
      this.driver.navigate().back();
      callback();
    }
  });

  steps.When(/^I go forward$/, function (callback) {
    if (platform === 'SAFARI' || platform === 'ELECTRON') {
      // Safari doesn't support back and forward properly
      console.error('Safari doesn\'t support back and forward properly');
      callback.pending();
    } else {
      this.driver.navigate().forward();
      callback();
    }
  });

  var expectFieldValue = function(self, selector, data, callback) {
    self.waitForElement(selector, 5000, function(elem) {
      console.log(selector, elem);
      elem.getAttribute('value').then(function(value) {
        expect(value).to.equal(data)
        callback();
      });
    });
  };

  steps.Given(/^the field '(.*)' contains '(.*)'$/, function (selector, data, callback) {
    expectFieldValue(this, selector, data, callback);
  });

  // extras.moveBrowser = moveBrowser;
  // extras.waitForBrowserToMoveTo = waitForBrowserToMoveTo;
  // extras.waitForBrowserToMoveToIgnoringQuery = waitForBrowserToMoveToIgnoringQuery;
  // extras.typeInto = typeInto;
  // extras.clickButton = clickButton;
  // extras.switchToMainBrowser = switchToMainBrowser;
  // extras.switchToAdminBrowser = switchToAdminBrowser;
  // extras.followLink = followLink;
  // extras.followLinkInElement = followLinkInElement
  // return extras;
















  // Compound level
  steps.Then(/^I navigate with subdomain '(.*)' to \/(.*)$/, function(subdomain, path, callback) {
    moveBrowser(this, '/'+path, callback, subdomain);
  });

  steps.Then(/^the browser moves with subdomain '(.*)' to \/(.*)$/, function(subdomain, path, callback) {
    waitForBrowserToMoveTo(this, '/'+path, callback, subdomain);
  });

  steps.Then(/^no errors are present$/, function(callback) {
    this.getNoErrors(function(value) {
      expect([]).to.deep.equal(value);
      callback();
    });
  });

  var signIn = function(self, username, password, callback) {
    moveBrowser(self, '/signout', function() {
      moveBrowser(self, '/signin', function() {
        typeInto(self, '#username', username, function() {
          typeInto(self, '#password', password, function() {
            clickButton(self, 'Sign in', function() {
              waitForBrowserToMoveTo(self, '/dashboard', function() {
                callback();
              })
            })
          })
        })
      })
    })
  };

  steps.Then(/^I sign in with '(.*)' and '(.*)'$/, function (username, password, callback) {
    signIn(this, username, password, callback);
  });

  steps.Then(/^I sign out$/, function(callback) {
    moveBrowser(this, '/signout', callback)
  });
};
