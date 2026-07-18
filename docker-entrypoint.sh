#!/bin/bash
set -e

# Run Laravel migrations if you want this to happen automatically on deploy
# Ensure you have your DB_ variables set in Render!
php artisan migrate --force

# Optimize Laravel for production
php artisan optimize

# Start Apache
exec "$@"
