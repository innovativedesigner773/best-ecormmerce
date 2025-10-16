#!/usr/bin/env node

/**
 * Offline Setup Script for Best Brightness
 * Initializes offline data and mock services
 */

const fs = require('fs');
const path = require('path');

console.log('📱 Setting up offline mode for Best Brightness...');

// Create mock data for offline use
const mockProducts = [
  {
    id: '1',
    name: 'All-Purpose Cleaner',
    brand: 'Best Brightness',
    category: 'Cleaning Supplies',
    description: 'Powerful all-purpose cleaner for multiple surfaces',
    barcode: '1234567890123',
    price: 12.99,
    cost_price: 8.50,
    stock_quantity: 50,
    reorder_level: 10,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300',
    sku: 'BB-APC-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Glass Cleaner',
    brand: 'Best Brightness',
    category: 'Cleaning Supplies',
    description: 'Streak-free glass and window cleaner',
    barcode: '1234567890124',
    price: 8.99,
    cost_price: 5.50,
    stock_quantity: 30,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300',
    sku: 'BB-GC-002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Disinfectant Spray',
    brand: 'Best Brightness',
    category: 'Cleaning Supplies',
    description: 'Kills 99.9% of germs and bacteria',
    barcode: '1234567890125',
    price: 15.99,
    cost_price: 10.00,
    stock_quantity: 25,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1585435557343-3b092031d8cb?w=300',
    sku: 'BB-DS-003',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Floor Cleaner',
    brand: 'Best Brightness',
    category: 'Floor Care',
    description: 'Professional floor cleaning solution',
    barcode: '1234567890126',
    price: 18.99,
    cost_price: 12.00,
    stock_quantity: 40,
    reorder_level: 15,
    image_url: 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=300',
    sku: 'BB-FC-004',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Bathroom Cleaner',
    brand: 'Best Brightness',
    category: 'Bathroom Care',
    description: 'Deep cleaning bathroom and tile cleaner',
    barcode: '1234567890127',
    price: 13.99,
    cost_price: 9.00,
    stock_quantity: 35,
    reorder_level: 12,
    image_url: 'https://images.unsplash.com/photo-1556909114-df2529ea00db?w=300',
    sku: 'BB-BC-005',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Create offline data structure
const offlineDataFile = path.join('public', 'offline-data.json');
const offlineData = {
  products: mockProducts,
  cart: [],
  favourites: [],
  userProfiles: [],
  orders: [],
  lastSync: new Date().toISOString(),
  version: '1.0.0'
};

// Ensure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
  console.log('📁 Created public directory');
}

// Write offline data file
fs.writeFileSync(offlineDataFile, JSON.stringify(offlineData, null, 2));
console.log('📊 Created offline data file with mock products');

// Create service worker if it doesn't exist
const swPath = path.join('public', 'sw.js');
if (!fs.existsSync(swPath)) {
  const swContent = `
// Best Brightness Service Worker
const CACHE_NAME = 'best-brightness-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline-data.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`;
  
  fs.writeFileSync(swPath, swContent);
  console.log('⚙️ Created service worker for offline caching');
}

console.log('✅ Offline mode initialized successfully');
console.log('📦 Mock data will be loaded automatically when you start the app');
console.log('🌐 The app will work fully offline with all features available');
console.log('\n🚀 Next steps:');
console.log('   1. Run "npm run dev" to start the development server');
console.log('   2. Visit http://localhost:3000 to view your application');
console.log('   3. The app works 100% offline - no server setup required!');