#!/bin/bash

set -e

echo "========================================="
echo "  AI Freelancer Business Manager"
echo "  Starting Application..."
echo "========================================="

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME="freelancer_manager"

# ==========================================
# 1. Clean up used ports
# ==========================================
echo ""
echo "[1/5] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo "  Port $port is free"
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ==========================================
# 2. Check PostgreSQL
# ==========================================
echo ""
echo "[2/5] Checking PostgreSQL..."

if ! command -v psql &> /dev/null; then
  echo "ERROR: PostgreSQL is not installed. Please install it first."
  exit 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL..."
  if [[ "$(uname)" == "Darwin" ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  fi
  sleep 2
fi

# Create database if not exists
if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "  Creating database: $DB_NAME"
  createdb "$DB_NAME" 2>/dev/null || true
else
  echo "  Database $DB_NAME exists"
fi

# ==========================================
# 3. Install dependencies
# ==========================================
echo ""
echo "[3/5] Installing dependencies..."

cd backend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
  npm install
else
  echo "  Backend dependencies up to date"
fi
cd ..

cd frontend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
  npm install
else
  echo "  Frontend dependencies up to date"
fi
cd ..

# ==========================================
# 4. Seed database
# ==========================================
echo ""
echo "[4/5] Seeding database..."
cd backend
node src/seed.js
cd ..

# ==========================================
# 5. Start servers with hot reload
# ==========================================
echo ""
echo "[5/5] Starting servers with hot reload..."
echo ""
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "========================================="
echo "  Application is running!"
echo "  Press Ctrl+C to stop all services"
echo "========================================="
echo ""

# Trap to kill all background processes on exit
trap 'echo ""; echo "Shutting down..."; kill 0; exit 0' SIGINT SIGTERM

# Start backend with --watch for hot reload (Node 18+)
cd backend
npx nodemon src/server.js &
BACKEND_PID=$!
cd ..

# Start frontend with Vite (HMR built-in)
cd frontend
npx vite --port $FRONTEND_PORT --host &
FRONTEND_PID=$!
cd ..

# Wait for any process to exit
wait
