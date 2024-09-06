# Infrastructure

Follow those instructions to install `gg` on a GNU/Linux Debian-based server.

## Installation

1. Install Debian without a GUI, with SSH access.
1. Create a user `gg`.

## Users

- `gg`: user to manage the server.
- `www-data`: user of the `app` & `server`.

## Packages

```sh
apt install rsync nginx postgresql sudo curl certbot python3-certbot-nginx
```

## Puppeteer packages

```sh
apt install \
ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \
wget xdg-utils
```

## SSH

Add your public key to the `~/.ssh/authorized_keys` file
for a smoother experience.

## Sudo

Configure `sudo` without a password prompt for a smoother experience.

- Add user in sudoers.

```sh
/usr/sbin/adduser gg sudo
```

- Remove password prompt.

```sh
/usr/sbin/visudo
```

Set `ALL=(ALL) NOPASSWD:ALL` in entries.

- Restart user session.

## Node

From https://github.com/nodesource/distributions:

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
./nodesource_setup.sh
apt-get install -y nodejs
node -v
```

## PostgreSQL

- Replace `peer` to `trust` in `/etc/postgresql/xx/main/pg_hba.conf`.
- Restart PostgreSQL with `/usr/sbin/service postgresql restart`.
- Execute (dev, prod):

```sh
psql -U postgres

CREATE ROLE gg WITH LOGIN PASSWORD 'gg';
ALTER ROLE gg CREATEDB;
CREATE DATABASE gg;
GRANT ALL PRIVILEGES ON DATABASE gg TO gg;
\c gg
GRANT ALL ON SCHEMA public TO gg;
```

- Execute (test):

```sh
psql -U postgres

CREATE DATABASE gg_test;
GRANT ALL PRIVILEGES ON DATABASE gg_test TO gg;
\c gg_test
GRANT ALL ON SCHEMA public TO gg;
```

## Nginx

```sh
rm /etc/nginx/sites-available/default
rm /etc/nginx/sites-enabled/default
rm -rf/var/www/html
```

## Let's Encrypt

```sh
certbot --nginx -d gg-charts.com
```
