#!/bin/bash
set -e

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Building frontend..."
npm run build

echo "Moving to backend..."
cd ../backend

echo "Installing composer..."
curl -sS https://getcomposer.org/installer | php

echo "Installing backend dependencies..."
php composer.phar install --no-dev --optimize-autoloader

echo "Build complete!"
