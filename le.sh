#/bin/bash

DOMAIN="multisigs.buidlguidl.com"

sudo certbot certonly --standalone -d $DOMAIN --config-dir ~/.certbot/config --logs-dir ~/.certbot/logs --work-dir ~/.certbot/work --keep-until-expiring
sudo cp -f ~/.certbot/config/live/$DOMAIN/privkey.pem dist/server.key;sudo chmod 0777 dist/server.key
sudo cp -f ~/.certbot/config/live/$DOMAIN/cert.pem dist/server.cert;sudo chmod 0777 dist/server.cert
