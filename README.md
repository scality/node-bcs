# node-bcs

## How to Install

    $ npm install

## Running tests

    $ npm test

This command uses the istanbul code coverage library to drive mocha tests.
See the package.json "scripts" entry for the full command.
To run individual tests, use `$ mocha tests/my-test.js --grep 'my test'`.

To browse the code coverage report, use:

    $ open coverage/lcov-report/index.html

## Code linting and style tools

### editorconfig

The .editorconfig file in this project (when used with a plugin in your IDE)
makes sure that whitespace is consistent.

### jshint

The .jshintrc file in this project defines rules for detecting
Javascript syntax errors and untidy code (like missing semicolons, or unused variables). You can run jshint from the command line, or
add an extension to your IDE to see inline errors

### jscs

The .jscrc file in this project defines code style rules. Use `npm test` or `$ ./node_modules/.bin/jscs src/*.js tests/*.js` to test them.

## Notes

### sprintf syntax

This project uses sprintf-js because Javascript does not have native
string templating like Python does.
Sprintf-js has a slightly different syntax for padding numbers.

python:

    "B%.4d%s\n" % (1, "two") => 'B0001two\n'

In javascript change `%.4d` to `%04d`:

    sprintf("B%'04d%s\n", 1, "two") => 'B0001two\n'

