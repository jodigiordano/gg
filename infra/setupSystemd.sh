#!/bin/sh

set -e

# cd into the directory of this script
# so all paths are relative to this script.
SCRIPT_DIRECTORY=$(cd "$(dirname "$0")" ; pwd -P)
cd "$SCRIPT_DIRECTORY"

if [ -z "$ENV" ]; then
  echo Missing ENV=./.env
  exit 1
fi

. ./.env.$ENV

rsync \
  ./gg@.service \
  --rsync-path 'sudo rsync' \
  --chown=root:root \
  $SSH_ENDPOINT:/etc/systemd/system/gg@.service

ssh $SSH_ENDPOINT "sudo systemctl enable gg@3000"
ssh $SSH_ENDPOINT "sudo systemctl enable gg@3001"
ssh $SSH_ENDPOINT "sudo systemctl enable gg@3002"
ssh $SSH_ENDPOINT "sudo systemctl enable gg@3003"

echo Done!
