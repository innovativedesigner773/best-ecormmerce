# Vercel Deployment Guide - Best Brightness E-Commerce

This guide provides complete instructions for deploying your Best Brightness E-Commerce platform to Vercel.

## Prerequisites

1. A Vercel account ([sign up for free](https://vercel.com/signup))
2. Your Supabase credentials
3. Barcode Lookup API key (if using barcode scanning features)

## Configuration Files

The following files have been configured for Vercel deployment:

### 1. `vercel.json`
- ✅ Framework set to Vite
- ✅ Build command configured
- ✅ Output directory set to `build`
- ✅ Serverless functions configured for API routes
- ✅ Rewrites configured for SPA and API routing

### 2. `package.json`
- ✅ Node.js version set to `>=18.x`
- ✅ Build scripts configured

### 3. API Files
- ✅ Converted from Deno to Node.js
- ✅ Environment variables updated to use `process.env`
- ✅ Hono server configured with Vercel adapter

## Deployment Steps

### Method 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Method 2: Deploy via Vercel Dashboard

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your Git repository

2. **Configure Project**
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (auto-detected from vercel.json)
   - Output Directory: `build` (auto-detected from vercel.json)
   - Install Command: `npm install` (auto-detected from vercel.json)

3. **Deploy**
   - Click "Deploy"

## Environment Variables

You **MUST** set the following environment variables in your Vercel project:

### Required Variables:

1. **SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://yusvpxltvvlhubwqeuzi.supabase.co`

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (keep this secret!)
   - Found in: Supabase Dashboard → Settings → API

3. **VITE_SUPABASE_URL**
   - Same as SUPABASE_URL (for client-side)

4. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous key
   - Found in: Supabase Dashboard → Settings → API

### Optional Variables:

5. **BARCODE_LOOKUP_API_KEY**
   - Required only if using barcode scanning features
   - Get from: [Barcode Lookup API](https://www.barcodelookup.com/)

6. **NODE_ENV**
   - Set to `production` for production deployment

### How to Add Environment Variables:

#### Via Vercel Dashboard:
1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with its value
4. Select environments: Production, Preview, Development
5. Click "Save"

#### Via Vercel CLI:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add BARCODE_LOOKUP_API_KEY
```

## API Routes

Your API is served through Hono and available at:

- Health check: `https://your-domain.vercel.app/make-server-8880f2f2/health`
- Products: `https://your-domain.vercel.app/make-server-8880f2f2/products`
- Barcode lookup: `https://your-domain.vercel.app/make-server-8880f2f2/barcode/lookup`
- And more...

## Troubleshooting

### Build Failures

**Issue**: Build fails with module not found
- **Solution**: Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Issue**: TypeScript errors during build
- **Solution**: Run `npm run type-check` locally to identify issues

### Runtime Errors

**Issue**: 500 errors from API routes
- **Solution**: Check that all environment variables are set correctly
- Check Vercel function logs in the dashboard

**Issue**: CORS errors
- **Solution**: Update CORS origins in `api/index.tsx` to include your Vercel domain

### Environment Variables

**Issue**: Variables not available
- **Solution**: Redeploy after adding environment variables
- Make sure variables are set for the correct environment (Production/Preview)

## Performance Optimization

The build is already optimized with:

- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification with Terser
- ✅ Console logs removed in production
- ✅ Manual chunks for better caching

## Custom Domain

To add a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Configure DNS according to Vercel's instructions

## Monitoring

- **Analytics**: Enable Vercel Analytics in project settings
- **Logs**: View real-time logs in Vercel Dashboard → Your Project → Functions
- **Performance**: Check Web Vitals in Vercel Analytics

## Post-Deployment Checklist

- [ ] All environment variables are set
- [ ] Health check endpoint returns 200: `/make-server-8880f2f2/health`
- [ ] Database connection works: `/make-server-8880f2f2/test-db`
- [ ] Frontend loads correctly
- [ ] API routes are accessible
- [ ] CORS is configured correctly
- [ ] Custom domain configured (optional)
- [ ] SSL certificate is active (automatic with Vercel)

## Support

If you encounter any issues:

1. Check Vercel function logs
2. Review environment variables
3. Verify Supabase connection
4. Check browser console for client-side errors

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Hono Documentation](https://hono.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated**: October 13, 2024
**Project**: Best Brightness E-Commerce Platform
**Deployment Platform**: Vercel

