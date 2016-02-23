#!/bin/sh

mkdir -p dist
if [ -e dist/cbt.gz ]; then
  rm dist/cbt.gz
fi
cd project
tar --exclude='./node_modules' --exclude='./.git' --exclude='./screenshots' --exclude='./lib/client/app.*' --exclude='./lib/client/debug.*' --exclude='./lib/client/release.*' --exclude='./lib/server/server.*' --exclude='*.swp' --exclude='*.swo' --exclude='./out' --exclude='./test.log' --exclude='./test/browser/features/support/*.js.map' --exclude='./test/browser/features/support/*.js' --exclude='./test/browser/features/step_definitions/*.js.map' --exclude='./test/browser/features/step_definitions/*.js' --exclude='./npm-debug.log' --exclude='./test.log' -zcvf ../dist/cbt.gz .
cd ../
ls -lah dist/cbt.gz

