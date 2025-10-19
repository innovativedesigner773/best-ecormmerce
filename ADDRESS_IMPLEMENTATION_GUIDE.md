# Address Auto-Population Implementation Guide

## Overview
This implementation adds auto-population for shipping information in the checkout form, allowing users to save multiple addresses and auto-fill shipping details.

## Features Implemented

### ✅ Auto-Population
- Auto-fills Address, City, Postal Code, and other fields with user's default/saved address
- Seamless integration with existing checkout flow

### ✅ Multiple Address Storage
- Users can store multiple addresses with custom labels (Home, Work, etc.)
- Each address can be marked as default
- Full CRUD operations (Create, Read, Update, Delete)

### ✅ Smart Form Behavior
- **Logged-in users**: Shows address selector first, auto-populates from selected address
- **Shared carts**: Shows manual entry form (no saved addresses available)
- Toggle between address selection and manual entry

### ✅ Enhanced Validation
- Validates that an address is selected for logged-in users
- Validates all required fields when using manual entry
- Clear error messages for missing information

## Files Created/Modified

### New Files:
- `src/utils/address-service.ts` - Address management service
- `src/components/address/AddressSelector.tsx` - Address selection component
- `src/utils/address-service-test.ts` - Testing utility

### Modified Files:
- `src/pages/customer/Checkout.tsx` - Integrated address selector and auto-population

## Database Integration
- Uses existing `user_profiles.address` JSONB field
- No database schema changes required
- Backward compatible with existing data

## Testing the Implementation

### 1. For Logged-in Users:
1. Go to checkout page
2. You should see the AddressSelector component
3. If no addresses exist, you'll see "No saved addresses found" with option to enter manually
4. Click "Add New Address" to add your first address
5. Select an address to auto-populate the form
6. Use "Enter Different Address" to manually enter a different address

### 2. For Shared Cart Checkouts:
1. Shared cart checkouts will show the manual entry form directly
2. No address selector is shown (as expected)

### 3. Testing Address Management:
1. Add multiple addresses with different labels
2. Set default addresses
3. Delete addresses
4. Verify auto-population works correctly

## Debugging

### Console Logs:
The implementation includes comprehensive logging:
- `🏠 Loading addresses for user:` - Shows when addresses are being loaded
- `🏠 Address load result:` - Shows the result of address loading
- `🏠 Loaded addresses:` - Shows the loaded addresses array
- `🏠 Auto-selecting default address:` - Shows when auto-selection occurs
- `🏠 Address selected:` - Shows when user selects an address

### Testing Utility:
You can test the address service directly in the browser console:
```javascript
// Test address service functionality
testAddressService('your-user-id-here');
```

## Troubleshooting

### Common Issues:

1. **Address selector not showing**:
   - Check if user is logged in
   - Check console for authentication errors

2. **Addresses not loading**:
   - Check console for Supabase connection issues
   - Verify user_profiles table exists and is accessible

3. **Auto-population not working**:
   - Check if address is properly selected
   - Verify shippingInfo state is updating correctly

4. **Form validation errors**:
   - Ensure all required fields are filled
   - Check if address is selected for logged-in users

## User Experience Flow

### First-time User:
1. Sees "No saved addresses found" message
2. Clicks "Enter Address Manually" or "Add New Address"
3. Fills out address form
4. Address is saved and auto-populated for future use

### Returning User:
1. Sees saved addresses in selector
2. Default address is auto-selected
3. Can switch between saved addresses
4. Can add new addresses or enter manually

### Shared Cart User:
1. Sees manual entry form directly
2. No address selector (as expected)
3. Standard checkout flow

## Performance Considerations
- Addresses are loaded only when needed
- Efficient JSONB storage in Supabase
- Minimal re-renders with proper state management
- Loading states for better UX

## Security
- Addresses are stored per user with proper RLS policies
- No sensitive data exposed
- Proper validation on all inputs
- Secure Supabase integration
