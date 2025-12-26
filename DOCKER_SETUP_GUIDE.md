# Cherry Dining & Lounge POS - Complete Docker Setup Guide

This guide walks you through building and running the POS system offline on your PC using Docker.

---

## Prerequisites

### 1. Install Docker Desktop

**Windows:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run the installer and follow the prompts
3. Restart your computer when prompted
4. Launch Docker Desktop and wait for it to fully start (whale icon in system tray will stop animating)

**Mac:**
1. Download Docker Desktop for Mac from https://www.docker.com/products/docker-desktop
2. Open the `.dmg` file and drag Docker to Applications
3. Launch Docker from Applications
4. Wait for Docker to fully start

**Linux (Ubuntu/Debian):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
docker compose version
```

### 2. Verify Docker is Running

Open a terminal/command prompt and run:
```bash
docker --version
docker compose version
```

You should see version numbers for both.

---

## Step-by-Step Deployment

### Step 1: Get the Project Files

**Option A - Clone from Git:**
```bash
git clone <your-repository-url>
cd cherry-dining-pos
```

**Option B - Download ZIP:**
1. Download the project ZIP file
2. Extract to a folder (e.g., `C:\Projects\cherry-pos` or `~/Projects/cherry-pos`)
3. Open terminal and navigate to the folder:
   ```bash
   cd /path/to/cherry-pos
   ```

### Step 2: Start the Application

Run this single command:

```bash
docker compose up -d --build
```

**What this does:**
- `docker compose up` - Starts all services
- `-d` - Runs in background (detached mode)
- `--build` - Builds the application from source

**First run takes 2-5 minutes** as it:
1. Downloads MySQL 8.0 image (~500MB)
2. Downloads Node.js 20 image (~180MB)
3. Installs all npm dependencies
4. Builds the React frontend
5. Initializes the MySQL database

### Step 3: Check Services are Running

```bash
docker compose ps
```

You should see:
```
NAME                STATUS              PORTS
cherry-pos-app      Up (healthy)        0.0.0.0:3000->3000/tcp
cherry-pos-mysql    Up (healthy)        0.0.0.0:3306->3306/tcp
```

### Step 4: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

### Step 5: Initialize System Data (First Time Only)

On the login page, you'll see an **"Initialize System Data"** button:

1. Click the button
2. Wait for the initialization to complete
3. This creates:
   - Admin user: `admin@cherrydining.com` / `admin123`
   - Sample menu categories (Starters, Main Course, Drinks, etc.)
   - Sample menu items (26 items with prices)
   - Sample staff accounts (manager, cashiers, bar staff, etc.)

### Step 6: Login

Use these credentials:
- **Email:** `admin@cherrydining.com`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change the admin password after first login!

---

## Verification Checklist

After setup, verify these work:

| Feature | How to Test |
|---------|------------|
| ✅ Login | Login with admin credentials |
| ✅ Dashboard | View dashboard metrics |
| ✅ POS | Create a new order |
| ✅ Menu | View menu items by category |
| ✅ Staff | View staff list |
| ✅ Settings | View restaurant settings |
| ✅ Orders | View order history |

---

## Common Commands

### Stop the Application
```bash
docker compose down
```
*Stops containers but keeps your data*

### Restart the Application
```bash
docker compose restart
```

### View Logs (if something isn't working)
```bash
# All logs
docker compose logs -f

# Just the application
docker compose logs -f app

# Just the database
docker compose logs -f mysql
```

### Completely Reset (Fresh Start)
```bash
# Stop and remove all data
docker compose down -v

# Start fresh
docker compose up -d --build
```
*This deletes all data including orders, users, settings!*

### Update After Code Changes
```bash
docker compose up -d --build
```

---

## Network Access

### Access from Same Computer
```
http://localhost:3000
```

### Access from Other Devices on Network
1. Find your computer's IP address:
   - **Windows:** Run `ipconfig` and look for IPv4 Address
   - **Mac/Linux:** Run `ifconfig` or `ip addr` and look for inet address

2. Access using that IP:
   ```
   http://192.168.1.xxx:3000
   ```

---

## Configuration Options

### Using Environment Variables

Create a `.env` file in the project root for custom settings:

```env
# Database passwords (use strong passwords in production!)
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_PASSWORD=your_strong_app_password

# JWT secret (use a long random string!)
JWT_SECRET=your_64_character_random_secret_key_here

# Port configuration
APP_PORT=3000
MYSQL_PORT=3306
```

### Generate Secure Secrets

**Windows (PowerShell):**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Find what's using the port
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000

# Solution: Use a different port
APP_PORT=8080 docker compose up -d
```

### "Cannot connect to database"
1. Wait 30-60 seconds after starting (MySQL needs time to initialize)
2. Check MySQL logs: `docker compose logs mysql`
3. Try a full reset: `docker compose down -v && docker compose up -d --build`

### "Container keeps restarting"
```bash
# Check logs for errors
docker compose logs app
```

### "Initialize System Data button doesn't work"
1. Check the app logs: `docker compose logs -f app`
2. Make sure MySQL is fully initialized (check MySQL logs)
3. Try again after a minute

### Docker Desktop not starting (Windows)
1. Ensure WSL 2 is installed: `wsl --install`
2. Restart your computer
3. Launch Docker Desktop again

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│                                                              │
│  ┌────────────────────┐       ┌────────────────────────┐    │
│  │                    │       │                        │    │
│  │   MySQL 8.0        │◄─────►│   Node.js Application  │    │
│  │                    │       │                        │    │
│  │   Container:       │       │   Container:           │    │
│  │   cherry-pos-mysql │       │   cherry-pos-app       │    │
│  │                    │       │                        │    │
│  │   Port: 3306       │       │   Port: 3000           │    │
│  │   Data: Persistent │       │   - Express REST API   │    │
│  │                    │       │   - React Frontend     │    │
│  └────────────────────┘       │   - Socket.IO          │    │
│                               └────────────────────────┘    │
│                                         │                    │
└─────────────────────────────────────────│────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │                     │
                               │   Your Browser      │
                               │   http://localhost  │
                               │                     │
                               └─────────────────────┘
```

---

## Data Flow

### Login Flow
```
Browser                    Express Server              MySQL
   │                            │                        │
   │  POST /api/auth/login      │                        │
   │  {email, password}         │                        │
   │ ──────────────────────────►│                        │
   │                            │  SELECT user           │
   │                            │ ──────────────────────►│
   │                            │◄─────────────────────  │
   │                            │  bcrypt.compare()      │
   │                            │  generateToken()       │
   │  {accessToken, user}       │                        │
   │ ◄──────────────────────────│                        │
```

### Bootstrap Flow
```
Browser                    Express Server              MySQL
   │                            │                        │
   │  POST /api/bootstrap/data  │                        │
   │ ──────────────────────────►│                        │
   │                            │  Check if empty        │
   │                            │ ──────────────────────►│
   │                            │  INSERT categories     │
   │                            │  INSERT menu_items     │
   │                            │  INSERT users          │
   │                            │ ──────────────────────►│
   │  {success, results}        │                        │
   │ ◄──────────────────────────│                        │
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User authentication (email, password_hash) |
| `profiles` | User details (name, avatar) |
| `user_roles` | User permissions (super_admin, manager, cashier, etc.) |
| `menu_categories` | Menu organization (Starters, Main Course, Drinks) |
| `menu_items` | Products for sale (name, price, category) |
| `orders` | Customer orders |
| `order_items` | Items within each order |
| `payments` | Payment records |
| `inventory_items` | Stock tracking |
| `stock_movements` | Stock changes history |
| `suppliers` | Vendor information |
| `restaurant_settings` | Business configuration |

---

## Staff Accounts (After Bootstrap)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@cherrydining.com | admin123 |
| Manager | manager@cherrydining.com | staff123 |
| Cashier 1 | cashier1@cherrydining.com | staff123 |
| Cashier 2 | cashier2@cherrydining.com | staff123 |
| Bar Staff | bar@cherrydining.com | staff123 |
| Kitchen Staff | kitchen@cherrydining.com | staff123 |
| Inventory | inventory@cherrydining.com | staff123 |

---

## Backing Up Your Data

### Create a Backup
```bash
docker compose exec mysql mysqldump -u pos_user -ppos_secure_password_2024 cherry_dining > backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
docker compose exec -T mysql mysql -u pos_user -ppos_secure_password_2024 cherry_dining < backup_file.sql
```

---

## Removing the Application

### Complete Removal
```bash
# Stop and remove containers and volumes
docker compose down -v

# Remove images (optional, frees ~1GB)
docker rmi cherry-dining-pos-app mysql:8.0
```

---

## Support

If you encounter issues:
1. Check the logs: `docker compose logs`
2. Verify Docker is running: `docker ps`
3. Try a fresh start: `docker compose down -v && docker compose up -d --build`

