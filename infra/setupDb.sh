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

if [ -z "$SCRIPT" ]; then
  echo Missing SCRIPT variable
  exit 1
fi

. ./.env.$ENV

export PGPASSWORD=$DATABASE_PASSWORD

echo Modifying database $DATABASE_NAME with $SCRIPT...

psql \
  --host=$DATABASE_HOST \
  --port=$DATABASE_PORT \
  --username=$DATABASE_USERNAME \
  --dbname=$DATABASE_NAME \
  --file=./$SCRIPT

echo Done!
