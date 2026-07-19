# Vercel deployment guide

## 1. Build the Laravel backend for Vercel

- Ensure the Vercel project points to the backend directory.
- Set the build command to `composer install --no-dev --optimize-autoloader`.
- Set the output directory to `public`.

## 2. Environment variables

Set the following variables in Vercel:

- APP_ENV=production
- APP_DEBUG=false
- APP_URL=https://gestion-stock-ten-pi.vercel.app
- FRONTEND_URL=https://gestion-stock-ten-pi.vercel.app
- DB_CONNECTION=pgsql
- DB_HOST=your-supabase-host
- DB_PORT=5432
- DB_DATABASE=postgres
- DB_USERNAME=your-supabase-user
- DB_PASSWORD=your-supabase-password
- DB_SSLMODE=require
- SANCTUM_STATEFUL_DOMAINS=gestion-stock-ten-pi.vercel.app
- SESSION_DRIVER=array
- SESSION_SECURE_COOKIE=true
- SESSION_SAME_SITE=lax
- CACHE_STORE=array
- QUEUE_CONNECTION=sync
- FILESYSTEM_DISK=local
- CLOUDINARY_CLOUD_NAME=your-cloud-name
- CLOUDINARY_API_KEY=your-cloud-key
- CLOUDINARY_API_SECRET=your-cloud-secret

## 3. Deploy

- Connect the backend repo to Vercel.
- Deploy the project.
- Test the health endpoint and auth routes.
