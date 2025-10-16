const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/utils/database-setup.tsx',
  'src/utils/exec-sql-setup.tsx',
  'src/utils/offline-manager.tsx',
  'src/utils/mock-api.tsx',
  'src/utils/order-service.tsx',
  'src/pages/customer/OrderHistory.tsx',
  'src/supabase/functions/server/kv_store.tsx',
  'src/supabase/functions/server/database-setup.tsx',
  'src/supabase/functions/server/middleware.tsx',
  'src/pages/customer/Cart.tsx',
  'src/contexts/OfflineContext.tsx',
  'src/contexts/FavouritesContext.tsx',
  'src/contexts/CartContext.tsx',
  'src/components/ui/toggle.tsx',
  'src/components/ui/toggle-group.tsx',
  'src/components/ui/sonner.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/resizable.tsx',
  'src/components/ui/radio-group.tsx',
  'src/components/ui/pagination.tsx',
  'src/components/ui/navigation-menu.tsx',
  'src/components/ui/menubar.tsx',
  'src/components/ui/input-otp.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/drawer.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/command.tsx',
  'src/components/ui/context-menu.tsx',
  'src/components/ui/chart.tsx',
  'src/components/ui/carousel.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/breadcrumb.tsx',
  'src/components/ui/accordion.tsx',
  'src/components/ui/badge.tsx',
  'src/components/common/ShareCartModal.tsx',
  'src/components/common/ShareableCartNotifications.tsx',
  'src/components/ui/alert.tsx',
  'src/components/admin/EnvironmentSetup.tsx',
  'src/components/admin/DatabaseSetup.tsx',
  'src/components/DemoBarcodes.tsx',
];

let totalFixed = 0;

filesToFix.forEach(file => {
  try {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Count matches before
    const beforeMatches = (content.match(/from ['"](@?[\w\-/@]+)@\d+\.\d+(\.\d+)?['"]/g) || []).length;
    
    // Remove version numbers from imports
    // Pattern: from "package-name@1.2.3" -> from "package-name"
    content = content.replace(/from (['"])(@?[\w\-/@]+)@\d+\.\d+(\.\d+)?(['"])/g, 'from $1$2$4');
    
    // Count matches after
    const afterMatches = (content.match(/from ['"](@?[\w\-/@]+)@\d+\.\d+(\.\d+)?['"]/g) || []).length;
    
    if (beforeMatches > 0) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${beforeMatches} imports in ${file}`);
      totalFixed += beforeMatches;
    }
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n✓ Total: Fixed ${totalFixed} versioned imports across ${filesToFix.length} files`);
