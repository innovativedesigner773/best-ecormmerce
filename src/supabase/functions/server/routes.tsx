// This file has been disabled to prevent server connection attempts
// The frontend now uses direct Supabase authentication instead of custom Edge Functions

console.log('✅ Routes disabled - using direct Supabase authentication');

// Export a simple routes object to prevent import errors
const routes = {
  message: 'Routes functionality moved to direct Supabase integration',
  status: 'disabled'
};

export default routes;