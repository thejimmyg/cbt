#!/bin/sh

E_BADARGS=85

if [ ! -n "$1" ]
then
  echo "Usage: `basename $0` DEST"
  exit $E_BADARGS
fi  


mkdir -p $1
if [ ! -e dist/cbt.gz ]; then
  ./build-template.sh
fi
CLABA=${PWD}
DIST=${CLABA}/dist/cbt.gz
cd $1
tar zxfv $DIST 2> /dev/null
echo "Project created in $1"
echo
echo "To get started install the dependencies:"
echo 
echo "    cd $1"
echo "    npm install"
echo 
echo "Then run the behaviour tests and start developing!"
echo 
echo "    npm run test-behaviour:build-watch"
echo "    HOST=https://localhost:10443 npm run bdd-tests 2> test.log"
