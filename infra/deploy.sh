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

echo Compiling...

(cd .. && npm ci && ENV=$ENV npm run compile)

echo Deploying...

rsync \
  ../. \
  --rsync-path 'sudo rsync' \
  --recursive \
  --links \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='infra/' \
  --delete-excluded \
  --chown=www-data:www-data \
  $SSH_ENDPOINT:/var/www/gg

rsync \
  ../server/.env.$ENV \
  --rsync-path 'sudo rsync' \
  --chown=www-data:www-data \
  $SSH_ENDPOINT:/var/www/gg/server/.env

echo Upgrading puppeteer...

ssh $SSH_ENDPOINT "cd /var/www/gg/server && sudo npx puppeteer browsers install"
ssh $SSH_ENDPOINT "sudo chown -R www-data:www-data /var/www/gg/server/.cache"


echo Restarting server...

ssh $SSH_ENDPOINT "sudo service gg@3000 restart"
ssh $SSH_ENDPOINT "sudo service gg@3001 restart"
ssh $SSH_ENDPOINT "sudo service gg@3002 restart"
ssh $SSH_ENDPOINT "sudo service gg@3003 restart"

echo Done!
