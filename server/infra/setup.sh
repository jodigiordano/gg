#!/bin/sh

# cd into the directory of this script
# so all paths are relative to this script.
SCRIPT_DIRECTORY=$(cd "$(dirname "$0")" ; pwd -P)
cd "$SCRIPT_DIRECTORY"

. $ENV_FILE

export PGPASSWORD=$DATABASE_PASSWORD

echo Initializing database $DATABASE_NAME...

psql \
  --host=$DATABASE_HOST \
  --port=$DATABASE_PORT \
  --username=$DATABASE_USERNAME \
  --dbname=$DATABASE_NAME \
  --file=./init.sql

echo Done!
