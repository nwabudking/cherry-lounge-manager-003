# Cherry Dining & Lounge POS - Docker Deployment Guide

Deploy the complete POS system with a single command using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed (included with Docker Desktop)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd cherry-dining-pos
```

### 2. Start Everything

```bash
docker-compose up -d
```

That's it! The system will:
- Start a MySQL database
- Initialize the database schema
- Build and start the Node.js application
- Serve the frontend

### 3. Access the Application

Open your browser and go to: **http://localhost:3000**

### Default Login

- **Email:** admin@cherrydining.com
- **Password:** admin123

> ⚠️ **Important:** Change the default password after first login!

---

## Configuration

### Using Environment Variables

Create a `.env` file in the project root to customize settings:

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=cherry_dining
MYSQL_USER=pos_user
MYSQL_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRES_IN=24h

# Port Configuration
APP_PORT=3000
MYSQL_PORT=3306
```

### Port Mapping

| Service | Default Port | Environment Variable |
|---------|-------------|---------------------|
| Application | 3000 | `APP_PORT` |
| MySQL | 3306 | `MYSQL_PORT` |

To run on a different port:
```bash
APP_PORT=8080 docker-compose up -d
```

---

## Commands Reference

### Start Services

```bash
# Start in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Rebuild and start (after code changes)
docker-compose up -d --build
```

### Stop Services

```bash
# Stop containers (preserves data)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Application only
docker-compose logs -f app

# MySQL only
docker-compose logs -f mysql
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
```

---

## Data Management

### Database Backups

**Create a backup:**
```bash
docker-compose exec mysql mysqldump -u root -p cherry_dining > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup:**
```bash
docker-compose exec -T mysql mysql -u root -p cherry_dining < backup_file.sql
```

### Data Persistence

Database data is stored in a Docker volume named `mysql_data`. This persists across container restarts.

To completely reset the database:
```bash
docker-compose down -v
docker-compose up -d
```

---

## Updating the Application

### Method 1: Pull and Rebuild

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Method 2: In-place Update (if only code changes)

```bash
docker-compose build app
docker-compose up -d app
```

---

## Troubleshooting

### Container Won't Start

1. Check logs:
   ```bash
   docker-compose logs
   ```

2. Ensure ports aren't in use:
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   ```

3. Try a fresh start:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Database Connection Issues

1. Wait for MySQL to fully initialize (can take 30-60 seconds on first run)

2. Check MySQL is healthy:
   ```bash
   docker-compose ps
   ```

3. Try connecting manually:
   ```bash
   docker-compose exec mysql mysql -u pos_user -p cherry_dining
   ```

### Application Errors

1. Check application logs:
   ```bash
   docker-compose logs -f app
   ```

2. Verify environment variables:
   ```bash
   docker-compose exec app env
   ```

### Reset Everything

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove any cached images
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

---

## Production Deployment

For production environments:

### 1. Use Strong Passwords

Create a `.env` file with strong passwords:
```env
MYSQL_ROOT_PASSWORD=<generate-strong-password>
MYSQL_PASSWORD=<generate-strong-password>
JWT_SECRET=<generate-64-character-random-string>
```

Generate secure secrets:
```bash
# Generate random password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

### 2. Use HTTPS

For production, place a reverse proxy (nginx, Traefik, Caddy) in front with SSL:

```yaml
# Example: Add to docker-compose.yml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
```

### 3. Regular Backups

Set up a cron job for automatic backups:
```bash
# Add to crontab
0 2 * * * cd /path/to/cherry-pos && docker-compose exec -T mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD cherry_dining > /backups/cherry_$(date +\%Y\%m\%d).sql
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │                 │         │                         │   │
│  │   MySQL 8.0     │◄───────►│   Node.js Application   │   │
│  │                 │         │                         │   │
│  │   Port: 3306    │         │   - Express API         │   │
│  │   Volume: data  │         │   - Socket.IO           │   │
│  │                 │         │   - Static Frontend     │   │
│  └─────────────────┘         │                         │   │
│                              │   Port: 3000            │   │
│                              └─────────────────────────┘   │
│                                        │                    │
└────────────────────────────────────────│────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │                     │
                              │   Web Browser       │
                              │   http://localhost  │
                              │                     │
                              └─────────────────────┘
```

---

## Support

For issues or questions, please open an issue in the repository.
