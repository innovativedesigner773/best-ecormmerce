// ============================================
// BROWSER CACHE CLEARING SCRIPT
// ============================================
// Run this in your browser console (F12) to clear all cached data
// Then test the registration with a fresh email address

console.log('🧹 Starting browser cache clearing...');

// Clear localStorage
try {
  localStorage.clear();
  console.log('✅ localStorage cleared');
} catch (e) {
  console.warn('⚠️ Could not clear localStorage:', e);
}

// Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
} catch (e) {
  console.warn('⚠️ Could not clear sessionStorage:', e);
}

// Clear IndexedDB (if used by Supabase)
if ('indexedDB' in window) {
  try {
    // Clear common Supabase IndexedDB databases
    const dbNames = ['supabase-auth', 'supabase', 'best-brightness-auth'];
    
    dbNames.forEach(dbName => {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      deleteReq.onsuccess = () => console.log(`✅ IndexedDB '${dbName}' cleared`);
      deleteReq.onerror = () => console.warn(`⚠️ Could not clear IndexedDB '${dbName}'`);
    });
  } catch (e) {
    console.warn('⚠️ Could not clear IndexedDB:', e);
  }
}

// Clear Service Worker caches (if any)
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName).then(() => {
        console.log(`✅ Cache '${cacheName}' cleared`);
      });
    });
  }).catch(e => {
    console.warn('⚠️ Could not clear caches:', e);
  });
}

// Clear cookies for the current domain
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cookies cleared');

console.log('');
console.log('🎉 ============================================');
console.log('🎉 BROWSER CACHE CLEARED SUCCESSFULLY!');
console.log('🎉 ============================================');
console.log('');
console.log('📋 NEXT STEPS:');
console.log('1. ✅ Cache cleared - DONE');
console.log('2. 🔄 Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('3. 📝 Go to /register page');
console.log('4. 🧪 Test registration with a NEW email address');
console.log('5. 👀 Watch browser console for any errors');
console.log('6. ✅ Registration should complete without database errors');
console.log('');
console.log('💡 If you still get errors, check the Network tab for failed requests');
console.log('💡 Also check Supabase Dashboard > Logs > Database for trigger logs');

// Automatically refresh the page after 3 seconds
setTimeout(() => {
  console.log('🔄 Auto-refreshing page in 3 seconds...');
  setTimeout(() => {
    window.location.reload(true);
  }, 3000);
}, 1000);