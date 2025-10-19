// Force Refresh Orders - Run this in browser console
console.log('🔄 Forcing orders refresh...');

// Clear all cached data
localStorage.clear();
sessionStorage.clear();

// Clear any cached orders specifically
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('order') || key.includes('bb:') || key.includes('best-brightness'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));

console.log('✅ Cache cleared');

// Force page refresh
setTimeout(() => {
  console.log('🔄 Refreshing page...');
  window.location.reload(true);
}, 1000);
