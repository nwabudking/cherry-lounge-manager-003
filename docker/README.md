# Cherry POS - Self-Hosted Supabase Deployment

This directory contains all the necessary files to deploy Cherry POS with a fully self-hosted Supabase backend for **offline/air-gapped environments**.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set your secrets
nano .env
```

**⚠️ IMPORTANT: Change these values before production deployment:**

- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - At least 32 characters (generate with `openssl rand -base64 32`)
- `ANON_KEY` - Generate at [Supabase Key Generator](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys)
- `SERVICE_ROLE_KEY` - Keep this secret!

### 2. Generate JWT Keys

Use the Supabase key generator or run:

```bash
# Install supabase CLI (if not installed)
npm install -g supabase

# Generate keys
supabase gen keys --experimental
```

### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.supabase.yml up -d

# View logs
docker-compose -f docker-compose.supabase.yml logs -f

# Check service health
docker-compose -f docker-compose.supabase.yml ps
```

### 4. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| **Cherry POS App** | http://localhost:5173 | Main application |
| **Supabase Studio** | http://localhost:3000 | Database admin |
| **Kong Gateway** | http://localhost:8000 | API gateway |
| **Inbucket** | http://localhost:9000 | Email testing |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │   App   │───▶│  Kong   │───▶│  REST   │───▶│ Postgres│      │
│  │ :5173   │    │  :8000  │    │         │    │  :5432  │      │
│  └─────────┘    └────┬────┘    └─────────┘    └─────────┘      │
│                      │                              ▲           │
│                      ├────────────────────┐         │           │
│                      ▼                    ▼         │           │
│                ┌─────────┐          ┌─────────┐     │           │
│                │  Auth   │          │Realtime │─────┘           │
│                │  :9999  │          │  :4000  │                 │
│                └─────────┘          └─────────┘                 │
│                      │                                          │
│                      ▼                                          │
│                ┌─────────┐    ┌─────────┐    ┌─────────┐       │
│                │ Storage │───▶│ImgProxy │    │Functions│       │
│                │  :5000  │    │  :8080  │    │  :9000  │       │
│                └─────────┘    └─────────┘    └─────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Services Overview

| Service | Image | Purpose |
|---------|-------|---------|
| **db** | supabase/postgres | PostgreSQL 15 with Supabase extensions |
| **kong** | kong:2.8.1 | API Gateway - routes all API requests |
| **auth** | supabase/gotrue | Authentication (signup, login, JWT) |
| **rest** | postgrest/postgrest | Auto-generated REST API from database |
| **realtime** | supabase/realtime | WebSocket subscriptions for live updates |
| **storage** | supabase/storage-api | File storage (images, documents) |
| **imgproxy** | darthsim/imgproxy | Image transformations |
| **meta** | supabase/postgres-meta | Database introspection for Studio |
| **studio** | supabase/studio | Web-based database admin |
| **functions** | supabase/edge-runtime | Deno edge functions |
| **inbucket** | inbucket/inbucket | Local email testing |
| **app** | custom | Cherry POS frontend |

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Custom Domain

To use a custom domain, update these variables:

```env
SUPABASE_PUBLIC_URL=https://api.yourdomain.com
SITE_URL=https://yourdomain.com
```

### SSL/TLS

For production, add an nginx reverse proxy or use Traefik:

```yaml
# Add to docker-compose.supabase.yml
traefik:
  image: traefik:v2.10
  command:
    - "--providers.docker=true"
    - "--entrypoints.websecure.address=:443"
    - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
  ports:
    - "443:443"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - ./letsencrypt:/letsencrypt
```

### Email Configuration

For production email delivery, configure SMTP:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SENDER_NAME=Cherry POS
```

## Management Commands

```bash
# Stop all services
docker-compose -f docker-compose.supabase.yml down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.supabase.yml down -v

# Restart a specific service
docker-compose -f docker-compose.supabase.yml restart auth

# View logs for a specific service
docker-compose -f docker-compose.supabase.yml logs -f db

# Execute SQL in database
docker exec -it cherry-pos-db psql -U postgres -d postgres

# Backup database
docker exec cherry-pos-db pg_dump -U postgres postgres > backup.sql

# Restore database
cat backup.sql | docker exec -i cherry-pos-db psql -U postgres -d postgres
```

## Updating

```bash
# Pull latest images
docker-compose -f docker-compose.supabase.yml pull

# Recreate containers with new images
docker-compose -f docker-compose.supabase.yml up -d --force-recreate
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is healthy
docker exec cherry-pos-db pg_isready -U postgres

# View database logs
docker logs cherry-pos-db
```

### Auth Not Working

```bash
# Check GoTrue logs
docker logs cherry-pos-auth

# Verify JWT secret matches
echo $JWT_SECRET
```

### Storage Upload Fails

```bash
# Check storage service logs
docker logs cherry-pos-storage

# Verify bucket permissions
docker exec cherry-pos-db psql -U postgres -c "SELECT * FROM storage.buckets;"
```

### API Returns 401/403

1. Verify `ANON_KEY` is correctly set
2. Check Kong configuration: `docker logs cherry-pos-kong`
3. Ensure JWT_SECRET matches across all services

## Security Considerations

1. **Change all default passwords** before production
2. **Use HTTPS** in production with valid SSL certificates
3. **Restrict network access** to management ports (3000, 9000)
4. **Regular backups** of the database volume
5. **Monitor logs** for suspicious activity
6. **Keep images updated** for security patches

## License

Cherry POS is proprietary software. Supabase components are licensed under Apache 2.0.
