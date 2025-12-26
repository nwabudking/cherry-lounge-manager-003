#!/bin/sh
set -e

echo "================================================"
echo "  Cherry Dining & Lounge POS - Starting..."
echo "================================================"

# Wait for MySQL to be ready (backup check in addition to healthcheck)
echo "Checking MySQL connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node -e "
        const mysql = require('mysql2/promise');
        mysql.createConnection({
            host: process.env.DB_HOST || 'mysql',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'pos_user',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'cherry_dining'
        }).then(conn => {
            conn.end();
            process.exit(0);
        }).catch(() => process.exit(1));
    " 2>/dev/null; then
        echo "✓ MySQL is ready!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for MySQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "✗ Failed to connect to MySQL after $MAX_RETRIES attempts"
    exit 1
fi

echo ""
echo "================================================"
echo "  Starting Node.js server..."
echo "================================================"
echo ""

# Execute the main command
exec "$@"
