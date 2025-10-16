#!/usr/bin/env node

/**
 * Deployment helper script for Best Brightness Edge Function
 * 
 * This script helps you deploy your Edge Function to Supabase
 * Run with: node deploy-server.js
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Best Brightness Edge Function Deployment Helper\n');

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📝 ${description}...`);
    console.log(`   Running: ${command}\n`);
    
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log(`⚠️  Warning: ${stderr}`);
      }
      
      console.log(`✅ ${description} completed`);
      if (stdout) {
        console.log(`   Output: ${stdout}`);
      }
      console.log('');
      resolve(stdout);
    });
  });
}

async function deployFunction() {
  try {
    console.log('🔍 Checking if Supabase CLI is installed...');
    
    try {
      await runCommand('supabase --version', 'Checking Supabase CLI version');
    } catch (error) {
      console.log('❌ Supabase CLI not found. Please install it first:');
      console.log('   macOS: brew install supabase/tap/supabase');
      console.log('   Windows: scoop install supabase');
      console.log('   Linux: curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh');
      process.exit(1);
    }

    // Check if user is logged in
    try {
      await runCommand('supabase projects list', 'Checking Supabase login status');
    } catch (error) {
      console.log('🔐 Please login to Supabase first:');
      await runCommand('supabase login', 'Logging in to Supabase');
    }

    // Ask for project ID
    const projectId = await new Promise((resolve) => {
      rl.question('📝 Enter your Supabase project ID (found in your dashboard URL): ', resolve);
    });

    if (!projectId.trim()) {
      console.log('❌ Project ID is required. Exiting.');
      process.exit(1);
    }

    // Link to project
    await runCommand(`supabase link --project-ref ${projectId.trim()}`, 'Linking to Supabase project');

    // Deploy the function
    await runCommand('supabase functions deploy server', 'Deploying Edge Function');

    // Ask about barcode API key
    const hasApiKey = await new Promise((resolve) => {
      rl.question('🔑 Do you have a Barcode Lookup API key to set? (y/n): ', (answer) => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });

    if (hasApiKey) {
      const apiKey = await new Promise((resolve) => {
        rl.question('🔑 Enter your Barcode Lookup API key: ', resolve);
      });
      
      if (apiKey.trim()) {
        await runCommand(`supabase secrets set BARCODE_LOOKUP_API_KEY=${apiKey.trim()}`, 'Setting API key');
      }
    }

    console.log('🎉 Deployment completed successfully!');
    console.log('\n📡 Your server is now available at:');
    console.log(`   https://${projectId.trim()}.supabase.co/functions/v1/make-server-8880f2f2/health`);
    console.log('\n🧪 Next steps:');
    console.log('   1. Refresh your Best Brightness app');
    console.log('   2. The "Server Connection Issue" banner should disappear');
    console.log('   3. Test the barcode scanning functionality');
    console.log('   4. Use the AppHealthChecker component to verify all systems');

  } catch (error) {
    console.log(`❌ Deployment failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure you have the correct project ID');
    console.log('   2. Verify you have access to the Supabase project');
    console.log('   3. Check your internet connection');
    console.log('   4. Try the manual deployment method in deployment-guide.md');
  } finally {
    rl.close();
  }
}

// Run the deployment
deployFunction();