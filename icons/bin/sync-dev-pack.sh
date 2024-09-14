#!/bin/sh

set -e

# cd into the directory of this script
# so all paths are relative to this script.
SCRIPT_DIRECTORY=$(cd "$(dirname "$0")" ; pwd -P)
cd "$SCRIPT_DIRECTORY"

# Clear current icons.
(cd ../src/dev && rm --force *)

# Move all "<name>-original.svg".
find ../../node_modules/devicon/icons -type f -name "*-original.svg" | xargs -I{} cp {} ../src/dev/

# Rename them "<name>.svg".
(cd ../src/dev && for f in *; do mv -- "$f" $(echo "$f" | sed 's/-original//g'); done)

# Move all "<name>-original-wordmark.svg":
find ../../node_modules/devicon/icons -type f -name "*-original-wordmark.svg" | xargs -I{} cp {} ../src/dev/

# Rename them "<name>.svg".
# In other terms, we prefer wordmark icons over non-wordmark icons.
(cd ../src/dev && for f in *-original-wordmark.svg; do mv -- "$f" $(echo "$f" | sed 's/-original-wordmark//g'); done)

# Rename icons to "dev-<name>.svg".
(cd ../src/dev && for f in *; do mv -- "$f" "dev-$f"; done)

# Some icons have execute permissions for some reasons.
(cd ../src/dev && chmod -R 644 *)
