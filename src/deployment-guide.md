# 🚀 Supabase Edge Function Deployment Guide

## Prerequisites
1. **Supabase CLI installed**: [Download here](https://supabase.com/docs/guides/cli)
2. **Supabase project created**: Make sure you have a Supabase project
3. **Environment variables set**: BARCODE_LOOKUP_API_KEY (if using barcode lookup)

## Quick Deployment Steps

### 1. Install Supabase CLI (if not already installed)
```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to your project
```bash
# Replace YOUR_PROJECT_ID with your actual Supabase project ID
supabase link --project-ref YOUR_PROJECT_ID
```

### 4. Deploy the Edge Function
```bash
# Deploy the server function
supabase functions deploy server
```

### 5. Set environment variables (if needed)
```bash
# Set the barcode lookup API key (if you have one)
supabase secrets set BARCODE_LOOKUP_API_KEY=your_api_key_here
```

## Alternative: Manual Deployment via Supabase Dashboard

### 1. Go to your Supabase Dashboard
- Visit: https://supabase.com/dashboard/projects
- Select your project
- Go to "Functions" in the left sidebar

### 2. Create a new function
- Click "Create a new function"
- Name: `server`
- Copy the entire content from `/supabase/functions/server/index.tsx`
- Click "Deploy function"

### 3. Set environment variables
- Go to "Settings" → "API"
- Go to "Functions" → "Environment variables"
- Add: `BARCODE_LOOKUP_API_KEY` (if you have one)

## Verification Steps

### 1. Test the health endpoint
After deployment, test your function:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8880f2f2/health
```

### 2. Check function logs
- In Supabase Dashboard → Functions → server → Logs
- Look for startup messages and any errors

### 3. Test from your app
- Refresh your Best Brightness app
- The "Server Connection Issue" banner should disappear
- Barcode scanning should work

## Troubleshooting

### Common Issues:

1. **"Function not found"**
   - Make sure the function is deployed with the correct name: `server`
   - Check the URL format matches your project ID

2. **"CORS errors"**
   - The function includes CORS headers for Figma.com
   - If still having issues, check the `origin` array in the CORS configuration

3. **"Environment variables not found"**
   - Set required environment variables using `supabase secrets set`
   - The BARCODE_LOOKUP_API_KEY is optional for basic functionality

4. **"Database connection failed"**
   - Make sure your Supabase project has the required tables
   - Run the database setup SQL files first

## Next Steps After Deployment

1. **Test all endpoints** using the AppHealthChecker component
2. **Initialize demo data** using the `/init-database` endpoint
3. **Test barcode scanning** functionality
4. **Verify user registration** works correctly

## Function URL Structure
Your deployed function will be available at:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-8880f2f2/ENDPOINT
```

Available endpoints:
- `/health` - Server health check
- `/test-db` - Database connection test
- `/products` - Get all products
- `/barcode/lookup` - Barcode product lookup
- `/barcode/check/:barcode` - Check if product exists
- `/init-database` - Initialize demo data (requires auth)
- `/barcode/add-product` - Add new product (requires auth)