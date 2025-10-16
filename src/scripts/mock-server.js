#!/usr/bin/env node

/**
 * Mock Server for Best Brightness
 * Provides API endpoints for offline development
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// Load offline data
let offlineData = {
  products: [],
  cart: [],
  favourites: [],
  userProfiles: [],
  orders: [],
  lastSync: new Date().toISOString()
};

const offlineDataPath = path.join('public', 'offline-data.json');
if (fs.existsSync(offlineDataPath)) {
  try {
    offlineData = JSON.parse(fs.readFileSync(offlineDataPath, 'utf8'));
    console.log(`📊 Loaded ${offlineData.products.length} products from offline data`);
  } catch (error) {
    console.warn('⚠️ Failed to load offline data, using defaults');
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`📡 ${method} ${path}`);
  
  // Mock API endpoints
  if (path === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      mode: 'mock-server',
      timestamp: new Date().toISOString(),
      message: 'Best Brightness mock server is running'
    }));
  } 
  else if (path === '/api/products') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      products: offlineData.products,
      count: offlineData.products.length,
      timestamp: new Date().toISOString()
    }));
  }
  else if (path.startsWith('/api/barcode/lookup')) {
    // Simulate delay for barcode lookup
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        product: {
          name: 'Sample Cleaning Product',
          brand: 'Best Brightness',
          category: 'Cleaning Supplies',
          description: 'Mock barcode lookup result',
          price: 9.99
        },
        timestamp: new Date().toISOString()
      }));
    }, 1000);
  }
  else if (path === '/api/test-db') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: 'Mock database connection successful',
      data: {
        products: offlineData.products.length,
        userProfiles: offlineData.userProfiles.length,
        orders: offlineData.orders.length
      },
      timestamp: new Date().toISOString()
    }));
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Endpoint not found',
      available_endpoints: [
        '/api/health',
        '/api/products', 
        '/api/barcode/lookup',
        '/api/test-db'
      ]
    }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Best Brightness Mock Server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log('   - GET /api/health');
  console.log('   - GET /api/products');
  console.log('   - POST /api/barcode/lookup');
  console.log('   - GET /api/test-db');
  console.log('');
  console.log('💡 This server provides mock data for offline development');
  console.log('🌐 Your main app runs on http://localhost:3000');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Mock server stopped');
    process.exit(0);
  });
});