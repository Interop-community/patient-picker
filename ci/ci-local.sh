#!/usr/bin/env bash

set -x

# set values provided at build time
export TARGET_ENV=test

. ci-0-set-properties.sh
. ci-1-prepare-sources.sh
#. ci-2-build-project.sh
#. ci-3-docker-image.sh
#. ci-4-aws-task-update.sh
#. ci-5-aws-service-update.sh
