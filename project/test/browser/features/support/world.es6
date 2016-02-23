var fs = require('fs');
var util = require('util');
var url = require('url');
var makeServer = null; //require('../../server/server');

var webdriver = require('selenium-webdriver');

// See http://stackoverflow.com/questions/32279574/how-run-two-chrome-driver-for-one-profile-with-selenium-webdriver-nodejs
var profileCounter = 0;
var buildChromeDriver = function(incognito) {
  var chrome = require('selenium-webdriver/chrome');
  profileCounter += 1;
  var options = new chrome.Options();
  var logging_prefs = new webdriver.logging.Preferences();
  logging_prefs.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.ALL);
  options.setLoggingPrefs(logging_prefs);
  if (incognito) {
    options.addArguments("-incognito")
  }
  return new webdriver.Builder().withCapabilities(options.toCapabilities()).build();
};


var getDriver = function(platform, server, port, host, makeServer) {
  switch(platform) {
    case 'CHROME':
      var driver = buildChromeDriver();
      break;
    case 'CHROME_INCOGNITO':
      var driver = buildChromeDriver(true);
      break;
    default:
      throw "No such platform " + platform;
  }
  return driver;
};


var webdriver = require('selenium-webdriver');
var expect = require('chai').expect;

var addWorld = function(world, platform, server, makeServer) {

  world.server = server;
  var defaultTimeout = 10000;

  world.getNoErrors = function(callback) {
    self.driver.executeScript('return window.jsErrors;').then(callback);
  };

  world.waitFor = function(cssLocator, timeout, callback) {
    var self = this;
    return self.driver.wait(function() {
      return self.driver.findElements(webdriver.By.css(cssLocator)).then(function(elements) {
        if (!elements[0]) {
          return false;
        }
        return elements[0].getInnerHtml().then(function(html) {
          if (html.length > 0) {
            callback(html);
            return true;
          }
          return false;
        });
      });
    }, timeout);
  };

  world.waitForValue = function(cssLocator, timeout, value, callback) {
    var self = this;
    return self.driver.wait(function() {
      return self.driver.findElements(webdriver.By.css(cssLocator)).then(function(elements) {
        if (!elements[0]) {
          return false;
        }
        return elements[0].getInnerHtml().then(function(html) {
          if (html.indexOf(value) !== -1) {
            callback();
            return true;
          }
          console.log(html, value);
          return false;
        });
      });
    }, timeout);
  };

  world.waitForNoValue = function(cssLocator, timeout, value, callback) {
    var self = this;
    return self.driver.wait(function() {
      return self.driver.findElements(webdriver.By.css(cssLocator)).then(function(elements) {
        if (!elements[0]) {
          console.error('Cant find the element:', cssLocator)
          return false;
        }
        return elements[0].getInnerHtml().then(function(html) {
          if (html.indexOf(value) === -1) {
            callback();
            return true;
          }
          console.log(html);
          return false;
        });
      });
    }, timeout);
  };

  world.waitForJSON = function(cssLocator, timeout, value, callback) {
    var self = this;
    return self.driver.wait(function() {
      return self.driver.findElements(webdriver.By.css(cssLocator)).then(function(elements) {
        if (!elements[0]) {
          return false;
        }
        return elements[0].getInnerHtml().then(function(html) {
          try {
            expect(JSON.parse(html)).to.deep.equal(value);
          } catch(e) {
            console.log(e, html, value);
            return false;
          }
          callback();
          return true;
        });
      });
    }, timeout);
  };

  world.waitForElement = function(cssLocator, timeout, callback) {
    var self = this;
    var waitTimeout = timeout || defaultTimeout;
    return self.driver.wait(function() {
      return self.driver.findElements(webdriver.By.css(cssLocator)).then(function(elements) {
        if (elements[0]) {
          callback(elements[0]);
          return true;
        } 
        return false;
      });
    }, waitTimeout);
  };
};

var logFile = fs.createWriteStream(__dirname + '/../../test.log', {flags : 'w'});
var logStdout = process.stdout;

var oldLog = console.log;
console.log = function() {
  var args = Array.prototype.slice.call(arguments);
  var res = [];
  for (var i=0; i<args.length; i++) {
    res.push(util.format(args[i]));
  }
  logFile.write(res.join(' ') + '\n');
};

console.log(process.env.HOST);
var host = process.env.HOST;
if (!host) {
   throw 'No HOST environment variable set';
} else {
   console.log('Server configured to', host);
}
var port = url.parse(host).port;

var server = [];
var platform = process.env.PLATFORM || "CHROME";
// Load this first so the window appears behind
var adminDriver = getDriver('CHROME_INCOGNITO');
var mainDriver = getDriver(platform, server, port, host, makeServer);

var World = function World(callback) {
  var defaultTimeout = 20000;
  var screenshotPath = "screenshots";
  this.platform = platform;
  console.log('platform:', this.platform);
  this.driver = this.mainDriver = mainDriver;
  this.adminDriver = adminDriver;
  if (!host) {
    throw 'No HOST environment variable configured';
  }
  this.host = host;
  this.port = port;
  console.log('[world] Host is :', this.host);
  if(!fs.existsSync(screenshotPath)) {
    fs.mkdirSync(screenshotPath);
  }
  addWorld(this, platform, server, makeServer);
  callback();
};

module.exports = {
  World: World
};
