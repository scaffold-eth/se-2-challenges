#/bin/bash

DOMAIN="backend.multisig.holdings"

sudo certbot certonly --standalone -d $DOMAIN --config-dir ~/.certbot/config --logs-dir ~/.certbot/logs --work-dir ~/.certbot/work --keep-until-expiring
sudo cp -f ~/.certbot/config/live/$DOMAIN/privkey.pem server.key;sudo chmod 0777 dist/server.key
sudo cp -f ~/.certbot/config/live/$DOMAIN/cert.pem server.cert;sudo chmod 0777 dist/server.cert
