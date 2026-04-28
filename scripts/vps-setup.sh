#!/usr/bin/env bash
##############################################################################
# vps-setup.sh — BlackScale Nexus VPS setup guide
#
# NOT meant to run as a single script. Execute each block manually and verify
# each step before continuing. Run as root unless noted otherwise.
##############################################################################

set -euo pipefail

# ─── 1. System update ───────────────────────────────────────────────────────
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ufw fail2ban certbot python3-certbot-nginx

# ─── 2. Create deployment user ──────────────────────────────────────────────
adduser daniel --gecos "" --disabled-password
echo "daniel:<STRONG_PASSWORD>" | chpasswd
usermod -aG sudo daniel

# Allow daniel to run npm start without sudo (set in /etc/sudoers.d/nexus later)

# ─── 3. SSH hardening ───────────────────────────────────────────────────────
# Upload your ed25519 public key first:
#   ssh-copy-id -i ~/.ssh/id_ed25519.pub daniel@<VPS_IP>

cat >> /etc/ssh/sshd_config << 'EOF'

# BlackScale Nexus hardening
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
MaxAuthTries 3
AuthenticationMethods publickey
EOF

systemctl restart sshd

# ─── 4. Firewall (UFW) ──────────────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP"
ufw allow 443/tcp  comment "HTTPS"
ufw --force enable
ufw status verbose

# ─── 5. Node.js via nvm (run as daniel) ─────────────────────────────────────
# su - daniel
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# source ~/.bashrc
# nvm install 22
# nvm use 22
# node --version

# ─── 6. Clone and configure app ─────────────────────────────────────────────
# su - daniel
# git clone https://github.com/daniel666674/auto-crm.git /opt/nexus
# cd /opt/nexus
# cp .env.example .env.production
# nano .env.production   # Fill in all required variables
# npm install --production
# npm run init           # Initialize database
# DANIEL_PASSWORD="<pw>" JULIAN_PASSWORD="<pw>" npx tsx scripts/seed-users.ts
# npm run build

# ─── 7. Systemd service ─────────────────────────────────────────────────────
cat > /etc/systemd/system/nexus.service << 'EOF'
[Unit]
Description=BlackScale Nexus CRM
After=network.target

[Service]
Type=simple
User=daniel
WorkingDirectory=/opt/nexus
EnvironmentFile=/opt/nexus/.env.production
ExecStart=/home/daniel/.nvm/versions/node/v22/bin/node node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexus
systemctl start nexus
systemctl status nexus

# ─── 8. Nginx ───────────────────────────────────────────────────────────────
cp /opt/nexus/config/nginx.conf /etc/nginx/sites-available/nexus
ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/nexus
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ─── 9. SSL certificate via Certbot ─────────────────────────────────────────
certbot --nginx -d crm.blackscale.consulting --non-interactive --agree-tos -m daniel.acosta@blackscale.consulting
# Certbot auto-configures nginx and sets up renewal via systemd timer

# ─── 10. Verify encryption ──────────────────────────────────────────────────
# cd /opt/nexus && node scripts/verify-encryption.js
# Expected output: "OK: Database is encrypted. SQLCipher is active."
# NOTE: Requires better-sqlite3 compiled with SQLCipher:
#   npm rebuild better-sqlite3 --build-from-source

# ─── 11. fail2ban ───────────────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
EOF

systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status

# ─── 12. Backup cron ────────────────────────────────────────────────────────
# Run as root:
chmod +x /opt/nexus/scripts/nexus-backup.sh
mkdir -p /var/backups/nexus/daily
# Add to root crontab (crontab -e):
# 0 2 * * * /opt/nexus/scripts/nexus-backup.sh

# Shortcut to add automatically:
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/nexus/scripts/nexus-backup.sh") | crontab -

echo ""
echo "==================================================================="
echo " BlackScale Nexus VPS setup complete."
echo " Visit: https://crm.blackscale.consulting"
echo "==================================================================="
