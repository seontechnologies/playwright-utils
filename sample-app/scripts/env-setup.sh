#!/bin/bash

# load environment vartiables from .env file if it exists
if [ -f .env ]; then
  set -a # all the vars that are defined subsequently, are exported to the env of subsequent commands
	source .env
	set +a # turn off allexport
fi

# git related things
export GITHUB_SHA=$(git rev-parse --short HEAD)
export GITHUB_BRANCH=$(git rev-parse --abbrev-ref HEAD)