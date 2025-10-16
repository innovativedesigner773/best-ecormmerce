# 🚀 Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment of your Best Brightness E-Commerce platform to Vercel.

## Pre-Deployment Checklist

### ✅ Local Setup
- [ ] All changes committed to Git
- [ ] `npm install` runs without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run type-check` shows no TypeScript errors
- [ ] Local development server works (`npm run dev`)

### ✅ Environment Variables Ready
Gather these values before deployment:

- [ ] **SUPABASE_URL** (from Supabase Dashboard → Settings → API)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** (from Supabase Dashboard → Settings → API)
- [ ] **VITE_SUPABASE_URL** (same as SUPABASE_URL)
- [ ] **VITE_SUPABASE_ANON_KEY** (from Supabase Dashboard → Settings → API)
- [ ] **BARCODE_LOOKUP_API_KEY** (optional - only if using barcode features)

### ✅ Vercel Account Setup
- [ ] Vercel account created ([vercel.com/signup](https://vercel.com/signup))
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Logged into Vercel CLI (`vercel login`)

## Deployment Steps

### Method 1: Vercel CLI (Recommended)

#### Step 1: Initial Setup
```bash
# Make sure you're in the project root
cd Best-Brightness

# Login to Vercel
vercel login

# Run preview deployment
vercel
```

- [ ] Preview deployment successful
- [ ] Preview URL received

#### Step 2: Configure Environment Variables
```bash
# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add BARCODE_LOOKUP_API_KEY
```

For each command:
- [ ] Enter the value when prompted
- [ ] Select environments: Production, Preview, Development

#### Step 3: Production Deployment
```bash
# Deploy to production
vercel --prod
```

- [ ] Production deployment successful
- [ ] Production URL received

### Method 2: Vercel Dashboard

#### Step 1: Import Project
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click "Add New" → "Project"
- [ ] Select your Git repository
- [ ] Click "Import"

#### Step 2: Configure Project
Verify these settings (should be auto-detected):
- [ ] Framework Preset: **Vite**
- [ ] Root Directory: `./`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Install Command: `npm install`

#### Step 3: Environment Variables
- [ ] Click "Environment Variables"
- [ ] Add `SUPABASE_URL` → Enter value → Select all environments
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` → Enter value → Select all environments
- [ ] Add `VITE_SUPABASE_URL` → Enter value → Select all environments
- [ ] Add `VITE_SUPABASE_ANON_KEY` → Enter value → Select all environments
- [ ] Add `BARCODE_LOOKUP_API_KEY` → Enter value → Select all environments (optional)

#### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Deployment successful

## Post-Deployment Testing

### ✅ Frontend Tests
- [ ] Visit your deployment URL: `https://your-project.vercel.app`
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Styles are applied
- [ ] Images load
- [ ] No console errors in browser DevTools

### ✅ API Tests
Test these endpoints in your browser or with curl:

#### Health Check
```bash
curl https://your-project.vercel.app/make-server-8880f2f2/health
```
- [ ] Returns JSON with status "healthy"

#### Database Connection
```bash
curl https://your-project.vercel.app/make-server-8880f2f2/test-db
```
- [ ] Returns successful database connection message

#### Products Endpoint
```bash
curl https://your-project.vercel.app/make-server-8880f2f2/products
```
- [ ] Returns products list (or empty array if no products)

### ✅ Authentication Tests
- [ ] Can register new user
- [ ] Can login
- [ ] Can logout
- [ ] Session persists on refresh
- [ ] Role-based access works (admin/cashier/customer)

### ✅ E-Commerce Features
- [ ] Can view products
- [ ] Can add to cart
- [ ] Cart persists
- [ ] Can checkout
- [ ] Barcode scanning works (if enabled)

## Troubleshooting

### Build Fails
**Error**: "Module not found"
- [ ] Run `npm install` locally
- [ ] Check all imports are correct
- [ ] Verify `package.json` includes all dependencies

**Error**: TypeScript errors
- [ ] Run `npm run type-check` locally
- [ ] Fix any type errors shown

### Runtime Errors
**Error**: 500 from API
- [ ] Check Vercel function logs
- [ ] Verify all environment variables are set
- [ ] Check Supabase credentials are correct

**Error**: CORS issues
- [ ] Update CORS origins in `api/index.tsx`
- [ ] Add your Vercel domain to allowed origins

**Error**: Database connection fails
- [ ] Verify `SUPABASE_URL` is correct
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- [ ] Check Supabase project is active

## Optional: Custom Domain

### Setup Custom Domain
- [ ] Go to Vercel Dashboard → Your Project → Settings → Domains
- [ ] Click "Add"
- [ ] Enter your domain name
- [ ] Configure DNS records as instructed
- [ ] Wait for SSL certificate (automatic)
- [ ] Verify domain works

## Monitoring & Optimization

### Enable Analytics
- [ ] Vercel Dashboard → Your Project → Analytics → Enable
- [ ] Review Web Vitals
- [ ] Monitor performance metrics

### Check Function Logs
- [ ] Vercel Dashboard → Your Project → Functions
- [ ] Review logs for errors
- [ ] Monitor function execution time

### Performance Review
- [ ] Run Lighthouse audit on deployment
- [ ] Check Core Web Vitals
- [ ] Review bundle size
- [ ] Optimize if needed

## Maintenance

### Regular Updates
- [ ] Keep dependencies updated (`npm update`)
- [ ] Monitor Vercel dashboard for issues
- [ ] Review function logs weekly
- [ ] Check for security alerts

### Backup
- [ ] Database backups enabled in Supabase
- [ ] Code pushed to Git repository
- [ ] Environment variables documented

## Success Criteria

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ All environment variables are set
- ✅ Frontend loads and navigates correctly
- ✅ API endpoints return expected responses
- ✅ Authentication works
- ✅ Database operations succeed
- ✅ No errors in browser console
- ✅ No errors in Vercel function logs

## Quick Reference

### Important URLs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project Settings**: https://vercel.com/dashboard/[your-project]/settings
- **Function Logs**: https://vercel.com/dashboard/[your-project]/logs
- **Environment Variables**: https://vercel.com/dashboard/[your-project]/settings/environment-variables

### Key Commands
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# View logs
vercel logs

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull
```

## Support Resources

- 📖 [VERCEL_DEPLOYMENT_COMPLETE.md](./VERCEL_DEPLOYMENT_COMPLETE.md) - Complete deployment guide
- 📖 [DEPLOYMENT_FIXES_SUMMARY.md](./DEPLOYMENT_FIXES_SUMMARY.md) - Summary of fixes made
- 🌐 [Vercel Documentation](https://vercel.com/docs)
- 🌐 [Hono on Vercel](https://hono.dev/getting-started/vercel)

---

**Status**: Ready to Deploy ✅
**Last Updated**: October 13, 2024

Good luck with your deployment! 🚀✨

