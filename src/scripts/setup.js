#!/usr/bin/env node

/**
 * Best Brightness E-Commerce Platform Setup Script
 * 
 * This script sets up everything needed to run the project offline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Best Brightness E-Commerce Platform Setup');
console.log('===========================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Don't install dependencies here - assume they're already installed or will be installed separately
console.log('📦 Checking dependencies...');
if (!fs.existsSync('node_modules')) {
  console.log('⚠️ Dependencies not found. Run "npm install" first.');
  console.log('🔄 Installing dependencies now...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    console.error('💡 Try running "npm install" manually first.');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies found\n');
}

// Step 2: Create necessary directories
console.log('📁 Creating project directories...');
const directories = [
  'public',
  'dist',
  'scripts',
  '.vscode'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ Created ${dir}/`);
  }
});

// Step 3: Create public assets
console.log('\n🖼️  Setting up public assets...');
const publicAssets = [
  {
    name: 'favicon.ico',
    content: createFaviconContent()
  },
  {
    name: 'manifest.json',
    content: JSON.stringify({
      "name": "Best Brightness E-Commerce",
      "short_name": "Best Brightness",
      "description": "Comprehensive e-commerce platform for cleaning supplies",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#97CF50",
      "icons": [
        {
          "src": "/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icon-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }, null, 2)
  },
  {
    name: 'robots.txt',
    content: `User-agent: *
Disallow: /admin/
Disallow: /cashier/
Allow: /

Sitemap: /sitemap.xml`
  }
];

publicAssets.forEach(asset => {
  const filePath = path.join('public', asset.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, asset.content);
    console.log(`   ✅ Created public/${asset.name}`);
  }
});

// Step 4: Create VS Code configuration
console.log('\n🔧 Setting up VS Code configuration...');
const vscodeSettings = {
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
};

const vscodePath = path.join('.vscode', 'settings.json');
if (!fs.existsSync(vscodePath)) {
  fs.writeFileSync(vscodePath, JSON.stringify(vscodeSettings, null, 2));
  console.log('   ✅ Created .vscode/settings.json');
}

// Step 5: Create environment template
console.log('\n🔐 Setting up environment configuration...');
const envTemplate = `# Best Brightness E-Commerce Environment Variables
# Copy this file to .env.local and fill in your actual values

# Supabase Configuration (for online mode)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Barcode Lookup API
VITE_BARCODE_LOOKUP_API_KEY=your_barcode_api_key_here

# Development Settings
VITE_DEV_MODE=true
VITE_MOCK_API=true
`;

if (!fs.existsSync('.env.example')) {
  fs.writeFileSync('.env.example', envTemplate);
  console.log('   ✅ Created .env.example');
}

// Step 6: Create development scripts
console.log('\n📝 Creating development scripts...');
createOfflineSetupScript();
createMockServerScript();

// Step 7: Create TypeScript configuration
console.log('\n⚙️  Setting up TypeScript configuration...');
const tsConfig = {
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/utils/*": ["./utils/*"],
      "@/lib/*": ["./lib/*"],
      "@/pages/*": ["./pages/*"],
      "@/contexts/*": ["./contexts/*"],
      "@/config/*": ["./config/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
};

if (!fs.existsSync('tsconfig.json')) {
  fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  console.log('   ✅ Created tsconfig.json');
}

// Step 8: Create ESLint configuration
const eslintConfig = {
  "root": true,
  "env": { "browser": true, "es2020": true },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "ignorePatterns": ["dist", ".eslintrc.cjs"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
};

if (!fs.existsSync('.eslintrc.json')) {
  fs.writeFileSync('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
  console.log('   ✅ Created .eslintrc.json');
}

// Final instructions
console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Run "npm run dev" to start the development server');
console.log('   2. Run "npm run offline-setup" to initialize offline data');
console.log('   3. Visit http://localhost:3000 to view your application');
console.log('\n🔧 For production deployment:');
console.log('   1. Copy .env.example to .env.local and fill in your Supabase credentials');
console.log('   2. Run "npm run build" to create a production build');
console.log('   3. Deploy the contents of the "dist" folder to your hosting provider');
console.log('\n📚 Documentation:');
console.log('   - Check deployment-guide.md for server deployment instructions');
console.log('   - Check guidelines/Guidelines.md for development guidelines');
console.log('   - Use the admin health checker to verify all systems');

function createFaviconContent() {
  // Simple base64 encoded 16x16 favicon
  return Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x28, 0x01,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
}

function createOfflineSetupScript() {
  const script = `#!/usr/bin/env node

/**
 * Offline Setup Script for Best Brightness
 * Initializes offline data and mock services
 */

console.log('📱 Setting up offline mode for Best Brightness...');

const fs = require('fs');

// Create offline data structure
const offlineData = {
  products: [],
  cart: [],
  favourites: [],
  userProfiles: [],
  orders: [],
  lastSync: new Date().toISOString()
};

// Save offline data structure
Object.keys(offlineData).forEach(key => {
  if (key !== 'lastSync') {
    localStorage.setItem(\`best-brightness-offline-\${key}\`, JSON.stringify(offlineData[key]));
  }
});

console.log('✅ Offline mode initialized');
console.log('📦 Mock data will be loaded automatically when you start the app');
console.log('🌐 The app will work fully offline with all features available');
`;

  fs.writeFileSync('scripts/offline-setup.js', script);
  console.log('   ✅ Created scripts/offline-setup.js');
}

function createMockServerScript() {
  const script = `#!/usr/bin/env node

/**
 * Mock Server for Best Brightness
 * Provides API endpoints for offline development
 */

const http = require('http');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Mock API endpoints
  if (path === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      mode: 'mock-server',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

server.listen(PORT, () => {
  console.log(\`🚀 Mock server running on http://localhost:\${PORT}\`);
  console.log('📡 Available endpoints:');
  console.log('   - GET /api/health');
});
`;

  fs.writeFileSync('scripts/mock-server.js', script);
  console.log('   ✅ Created scripts/mock-server.js');
}