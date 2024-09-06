#!/bin/sh

set -e

# cd into the directory of this script
# so all paths are relative to this script.
SCRIPT_DIRECTORY=$(cd "$(dirname "$0")" ; pwd -P)
cd "$SCRIPT_DIRECTORY"

. ./.env.$ENV

rsync \
  . \
  --recursive \
  --delete \
  --mkpath \
  $SSH_ENDPOINT:~/infra

echo Done!
