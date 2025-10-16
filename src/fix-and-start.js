#!/usr/bin/env node

/**
 * Fix and Start Script for Best Brightness
 * Handles immediate setup and launch
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Best Brightness - Fix and Start');
console.log('==================================\n');

// Step 1: Ensure directories exist
console.log('📁 Creating required directories...');
const directories = ['scripts', 'public', 'src'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ Created ${dir}/`);
  }
});

// Step 2: Install dependencies if needed
if (!fs.existsSync('node_modules')) {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    console.log('\n💡 Try running these commands manually:');
    console.log('   npm cache clean --force');
    console.log('   npm install');
    process.exit(1);
  }
} else {
  console.log('📦 Dependencies already installed');
}

// Step 3: Create basic offline data
console.log('\n📱 Setting up offline data...');
const offlineDataPath = 'public/offline-data.json';
const mockData = {
  products: [
    {
      id: '1',
      name: 'All-Purpose Cleaner',
      brand: 'Best Brightness',
      category: 'Cleaning Supplies',
      description: 'Powerful all-purpose cleaner for multiple surfaces',
      barcode: '1234567890123',
      price: 12.99,
      stock_quantity: 50,
      image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300',
      sku: 'BB-APC-001',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Glass Cleaner',
      brand: 'Best Brightness',
      category: 'Cleaning Supplies',
      description: 'Streak-free glass and window cleaner',
      barcode: '1234567890124',
      price: 8.99,
      stock_quantity: 30,
      image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300',
      sku: 'BB-GC-002',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  cart: [],
  favourites: [],
  userProfiles: [],
  orders: [],
  lastSync: new Date().toISOString()
};

fs.writeFileSync(offlineDataPath, JSON.stringify(mockData, null, 2));
console.log('✅ Created offline data with demo products');

// Step 4: Create environment file
if (!fs.existsSync('.env.local')) {
  console.log('\n🔧 Creating environment configuration...');
  const envContent = `# Best Brightness - Works 100% Offline
VITE_DEV_MODE=true
VITE_MOCK_API=true
VITE_OFFLINE_MODE=true
`;
  fs.writeFileSync('.env.local', envContent);
  console.log('✅ Created .env.local');
}

// Step 5: Start the app
console.log('\n🚀 Starting Best Brightness...');
console.log('📱 Your app will be available at: http://localhost:3000');
console.log('💡 Works 100% offline - no server setup needed!');
console.log('\n🌐 Press Ctrl+C to stop\n');

try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.log('\n🛑 Server stopped');
  process.exit(0);
}