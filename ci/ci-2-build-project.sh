#!/usr/bin/env bash

echo "::: STARTING THE BUILD"

npm run build:${TARGET_ENV}

echo "::: BUILD ENDED"


#set -x
#echo "nothing to do"
