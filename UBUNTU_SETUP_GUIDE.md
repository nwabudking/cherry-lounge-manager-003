# Cherry Dining POS - Ubuntu Desktop Setup Guide

Complete step-by-step guide to deploy the POS system on Ubuntu Desktop.

---

## Step 1: Install Docker

Open Terminal (Ctrl+Alt+T) and run these commands one by one:

```bash
# Update package list
sudo apt update

# Install required packages
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update and install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER
```

**IMPORTANT:** Log out and log back in (or restart) for the group change to take effect.

---

## Step 2: Verify Docker Installation

After logging back in, open Terminal and run:

```bash
docker --version
docker compose version
```

You should see:
```
Docker version 24.x.x or higher
Docker Compose version v2.x.x or higher
```

Test Docker works without sudo:
```bash
docker run hello-world
```

---

## Step 3: Get the Project Files

### Option A: Clone from Git
```bash
cd ~
git clone <your-repository-url> cherry-pos
cd cherry-pos
```

### Option B: Download and Extract ZIP
```bash
cd ~
# If you downloaded a ZIP file, extract it:
unzip cherry-pos.zip -d cherry-pos
cd cherry-pos
```

### Option C: Copy from USB/External Drive
```bash
# Copy files (adjust path as needed)
cp -r /media/$USER/USB_DRIVE/cherry-pos ~/cherry-pos
cd ~/cherry-pos
```

---

## Step 4: Build and Start the Application

```bash
cd ~/cherry-pos
docker compose up -d --build
```

**Wait 3-5 minutes** on first run. You can watch the progress:
```bash
docker compose logs -f
```

Press `Ctrl+C` to stop watching logs.

---

## Step 5: Check Everything is Running

```bash
docker compose ps
```

You should see both containers with "Up (healthy)" status:
```
NAME                STATUS              PORTS
cherry-pos-app      Up (healthy)        0.0.0.0:3000->3000/tcp
cherry-pos-mysql    Up (healthy)        0.0.0.0:3306->3306/tcp
```

---

## Step 6: Open the Application

Open Firefox or Chrome and go to:
```
http://localhost:3000
```

---

## Step 7: Initialize System Data (First Time Only)

On the login page:

1. Find the **"Initialize System Data"** button at the bottom
2. Click it and wait for the success message
3. This creates your admin account and sample data

---

## Step 8: Login

Use these credentials:
- **Email:** `admin@cherrydining.com`
- **Password:** `admin123`

**Change the password after first login!**

---

## Quick Reference Commands

Save these commands for daily use:

```bash
# Start the POS (if stopped)
cd ~/cherry-pos && docker compose up -d

# Stop the POS
cd ~/cherry-pos && docker compose down

# Restart the POS
cd ~/cherry-pos && docker compose restart

# View logs (if something isn't working)
cd ~/cherry-pos && docker compose logs -f

# Check status
cd ~/cherry-pos && docker compose ps

# Full reset (DELETES ALL DATA!)
cd ~/cherry-pos && docker compose down -v && docker compose up -d --build
```

---

## Create Desktop Shortcut (Optional)

### Start POS Shortcut

```bash
# Create the script
cat > ~/start-pos.sh << 'EOF'
#!/bin/bash
cd ~/cherry-pos
docker compose up -d
sleep 3
xdg-open http://localhost:3000
EOF

chmod +x ~/start-pos.sh

# Create desktop shortcut
cat > ~/Desktop/Cherry-POS.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Cherry POS
Comment=Start Cherry Dining POS
Exec=/home/$USER/start-pos.sh
Icon=utilities-terminal
Terminal=false
Categories=Application;
EOF

# Replace $USER with actual username
sed -i "s/\$USER/$USER/g" ~/Desktop/Cherry-POS.desktop

# Make it executable
chmod +x ~/Desktop/Cherry-POS.desktop

# Trust the shortcut (Ubuntu 22.04+)
gio set ~/Desktop/Cherry-POS.desktop metadata::trusted true
```

Now you can double-click "Cherry POS" on your desktop to start!

---

## Auto-Start on Boot (Optional)

To make the POS start automatically when Ubuntu boots:

```bash
# Create systemd service
sudo tee /etc/systemd/system/cherry-pos.service << EOF
[Unit]
Description=Cherry Dining POS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/cherry-pos
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable cherry-pos.service

# Start it now (optional)
sudo systemctl start cherry-pos.service
```

---

## Access from Other Devices

### Find Your IP Address
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Look for something like `192.168.1.xxx`

### Access from Phone/Tablet/Other PC
Open browser on the other device and go to:
```
http://192.168.1.xxx:3000
```

(Replace `xxx` with your actual IP)

---

## Backup Your Data

### Create Backup
```bash
cd ~/cherry-pos
docker compose exec mysql mysqldump -u pos_user -ppos_secure_password_2024 cherry_dining > ~/cherry-backup-$(date +%Y%m%d).sql
echo "Backup saved to ~/cherry-backup-$(date +%Y%m%d).sql"
```

### Restore Backup
```bash
cd ~/cherry-pos
docker compose exec -T mysql mysql -u pos_user -ppos_secure_password_2024 cherry_dining < ~/cherry-backup-YYYYMMDD.sql
```

### Automated Daily Backup (Optional)
```bash
# Create backup script
cat > ~/backup-pos.sh << 'EOF'
#!/bin/bash
cd ~/cherry-pos
BACKUP_FILE=~/pos-backups/cherry-$(date +%Y%m%d-%H%M).sql
mkdir -p ~/pos-backups
docker compose exec -T mysql mysqldump -u pos_user -ppos_secure_password_2024 cherry_dining > $BACKUP_FILE
# Keep only last 7 days
find ~/pos-backups -name "*.sql" -mtime +7 -delete
echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x ~/backup-pos.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-pos.sh") | crontab -
```

---

## Troubleshooting

### "Permission denied" when running docker
```bash
# Make sure you're in the docker group
groups

# If 'docker' is not listed, add yourself and reboot
sudo usermod -aG docker $USER
sudo reboot
```

### "Port 3000 already in use"
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill it (replace PID with actual number)
sudo kill -9 PID

# Or use a different port
APP_PORT=8080 docker compose up -d
# Then access at http://localhost:8080
```

### "Cannot connect to database"
```bash
# Check if MySQL is running
docker compose ps

# Wait for MySQL to fully start (check logs)
docker compose logs mysql

# If stuck, full reset
docker compose down -v
docker compose up -d --build
```

### Application not loading
```bash
# Check app logs
docker compose logs app

# Check if containers are healthy
docker compose ps

# Restart everything
docker compose restart
```

### Docker daemon not running
```bash
# Start Docker service
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker
```

---

## Staff Login Accounts

After initialization:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@cherrydining.com | admin123 |
| Manager | manager@cherrydining.com | staff123 |
| Cashier 1 | cashier1@cherrydining.com | staff123 |
| Cashier 2 | cashier2@cherrydining.com | staff123 |
| Bar Staff | bar@cherrydining.com | staff123 |
| Kitchen | kitchen@cherrydining.com | staff123 |
| Inventory | inventory@cherrydining.com | staff123 |

---

## Complete Removal

If you need to completely remove the POS:

```bash
cd ~/cherry-pos

# Stop and remove containers + data
docker compose down -v

# Remove Docker images (frees ~1GB)
docker rmi cherry-pos-app mysql:8.0

# Remove project folder
cd ~
rm -rf cherry-pos

# Remove desktop shortcut (if created)
rm -f ~/Desktop/Cherry-POS.desktop
rm -f ~/start-pos.sh

# Remove systemd service (if created)
sudo systemctl disable cherry-pos.service
sudo rm /etc/systemd/system/cherry-pos.service
```

---

## Summary Checklist

- [ ] Docker installed
- [ ] User added to docker group
- [ ] Logged out and back in
- [ ] Project files downloaded/cloned
- [ ] `docker compose up -d --build` completed
- [ ] Both containers showing "healthy"
- [ ] Browser opens http://localhost:3000
- [ ] "Initialize System Data" clicked
- [ ] Logged in as admin
- [ ] Changed admin password

**You're ready to use Cherry Dining POS!**
