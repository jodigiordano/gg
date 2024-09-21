#!/bin/sh

set -e

# cd into the directory of this script
# so all paths are relative to this script.
SCRIPT_DIRECTORY=$(cd "$(dirname "$0")" ; pwd -P)
cd "$SCRIPT_DIRECTORY"

if [ -z "$ENV" ]; then
  echo Missing ENV variable
  exit 1
fi

. ./.env.$ENV

echo Synchronize configuration...

ssh $SSH_ENDPOINT "sudo mkdir -p /var/www/gg"
ssh $SSH_ENDPOINT "sudo chown -R www-data:www-data /var/www/gg"

rsync \
  ./nginx.conf \
  --rsync-path 'sudo rsync' \
  --chown=root:root \
  $SSH_ENDPOINT:/etc/nginx/nginx.conf

rsync \
  ./nginx.site.$ENV \
  --rsync-path 'sudo rsync' \
  --chown=root:root \
  $SSH_ENDPOINT:/etc/nginx/sites-enabled/app

echo Restart nginx...

ssh $SSH_ENDPOINT "sudo /usr/sbin/service nginx restart"

echo Done!
