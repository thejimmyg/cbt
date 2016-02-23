# cbt

~~~
brew install chromedriver
~~~

Or get from http://chromedriver.storage.googleapis.com/index.html

Get the code installed:

~~~
npm install
~~~

Build the .js files:

~~~
npm run test-behaviour:build-watch
~~~

Now you are ready to run tests:

~~~
npm run bdd-tests
~~~

There are some tricks to make things easier.

If you install a global error handler in your page that looks like this:

~~~
window.jsErrors = [];
window.onerror = function(errorMessage) {
  window.jsErrors.push(errorMessage);
}
~~~

Then you can use:

```
Then no errors are present
```

To check there have been no JS errors.
