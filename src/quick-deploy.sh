#!/bin/bash

# Quick deployment script for Best Brightness Edge Function
# Make this file executable: chmod +x quick-deploy.sh
# Run with: ./quick-deploy.sh

echo "🚀 Best Brightness Edge Function Quick Deploy"
echo "============================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            echo "❌ Homebrew not found. Please install Supabase CLI manually:"
            echo "   Visit: https://supabase.com/docs/guides/cli"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
    else
        echo "❌ Unsupported OS. Please install Supabase CLI manually:"
        echo "   Visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

echo "✅ Supabase CLI is available"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Logging in to Supabase..."
    supabase login
fi

echo "✅ Supabase login verified"

# Get project ID
read -p "📝 Enter your Supabase project ID: " PROJECT_ID

if [[ -z "$PROJECT_ID" ]]; then
    echo "❌ Project ID is required"
    exit 1
fi

# Link to project
echo "🔗 Linking to project..."
supabase link --project-ref "$PROJECT_ID"

# Deploy function
echo "🚀 Deploying Edge Function..."
supabase functions deploy server

# Check if deployment was successful
if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📡 Your server is now available at:"
    echo "   https://$PROJECT_ID.supabase.co/functions/v1/make-server-8880f2f2/health"
    echo ""
    echo "🧪 Test your deployment:"
    echo "   curl https://$PROJECT_ID.supabase.co/functions/v1/make-server-8880f2f2/health"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Refresh your Best Brightness app"
    echo "   2. The server connection banner should disappear"
    echo "   3. Test barcode scanning functionality"
else
    echo "❌ Deployment failed. Check the output above for errors."
    exit 1
fi

# Optional: Set API key
read -p "🔑 Do you want to set a Barcode Lookup API key? (y/n): " SET_API_KEY

if [[ "$SET_API_KEY" =~ ^[Yy] ]]; then
    read -p "🔑 Enter your Barcode Lookup API key: " API_KEY
    if [[ -n "$API_KEY" ]]; then
        echo "🔐 Setting API key..."
        supabase secrets set BARCODE_LOOKUP_API_KEY="$API_KEY"
        echo "✅ API key set successfully"
    fi
fi

echo ""
echo "🎉 All done! Your Best Brightness server is ready to use."