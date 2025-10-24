import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Address, AddressService } from '../../utils/address-service';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface AddressSelectorProps {
  onAddressSelect: (address: Address) => void;
  selectedAddress?: Address | null;
  showAddNew?: boolean;
  className?: string;
  userProfile?: any; // User profile data for auto-population
}

export default function AddressSelector({ 
  onAddressSelect, 
  selectedAddress, 
  showAddNew = true,
  className = '',
  userProfile
}: AddressSelectorProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    label: 'Home',
    isDefault: false
  });

  const provinces = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  useEffect(() => {
    loadAddresses();
  }, [user]);

  // Auto-populate personal details from user profile when available
  useEffect(() => {
    if (userProfile && user) {
      setNewAddress(prev => ({
        ...prev,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || user.email || '',
        phone: userProfile.phone || '',
      }));
    }
  }, [userProfile, user]);

  const loadAddresses = async () => {
    if (!user?.id) {
      console.log('🏠 No user ID, skipping address load');
      return;
    }
    
    console.log('🏠 Loading addresses for user:', user.id);
    setLoading(true);
    try {
      const result = await AddressService.getUserAddresses(user.id);
      console.log('🏠 Address load result:', result);
      
      if (result.success && result.data) {
        const addresses = result.data as Address[];
        console.log('🏠 Loaded addresses:', addresses);
        setAddresses(addresses);
        
        // Auto-select default address if none selected
        if (!selectedAddress && addresses.length > 0) {
          const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0];
          console.log('🏠 Auto-selecting default address:', defaultAddr);
          onAddressSelect(defaultAddr);
        }
      } else {
        console.log('🏠 No addresses found or error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!user?.id) return;

    // For logged-in users, only validate address fields since personal details are auto-populated
    const addressFields = ['address', 'city', 'postalCode', 'province'];
    const allFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'province'];
    
    const fieldsToValidate = user ? addressFields : allFields;
    const missing = fieldsToValidate.filter(field => !newAddress[field as keyof Address]);
    
    if (missing.length > 0) {
      toast.error(`Please fill in all required fields: ${missing.join(', ')}`);
      return;
    }

    try {
      const result = await AddressService.addAddress(user.id, newAddress as Omit<Address, 'id' | 'createdAt' | 'updatedAt'>);
      if (result.success) {
        toast.success('Address added successfully!');
        setNewAddress({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          postalCode: '',
          province: '',
          label: 'Home',
          isDefault: false
        });
        setShowAddForm(false);
        loadAddresses();
        
        // Auto-select the new address if it's the first one or marked as default
        if (result.data) {
          const addedAddress = Array.isArray(result.data) ? result.data[result.data.length - 1] : result.data;
          if (addedAddress.isDefault || addresses.length === 0) {
            onAddressSelect(addedAddress);
          }
        }
      } else {
        toast.error(result.error || 'Failed to add address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const result = await AddressService.deleteAddress(user.id, addressId);
      if (result.success) {
        toast.success('Address deleted successfully!');
        loadAddresses();
        // If we deleted the selected address, select the default one
        if (selectedAddress?.id === addressId) {
          const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
          if (remainingAddresses.length > 0) {
            const defaultAddr = remainingAddresses.find(addr => addr.isDefault) || remainingAddresses[0];
            onAddressSelect(defaultAddr);
          }
        }
      } else {
        toast.error(result.error || 'Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) return;

    try {
      const result = await AddressService.setDefaultAddress(user.id, addressId);
      if (result.success) {
        toast.success('Default address updated!');
        loadAddresses();
      } else {
        toast.error(result.error || 'Failed to update default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to update default address');
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#97CF50]"></div>
          <span className="ml-2 text-[#2C3E50]">Loading addresses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-[#97CF50] mr-2" />
            <h3 className="text-lg font-semibold text-[#2C3E50]">Delivery Address</h3>
          </div>
          {addresses.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#97CF50] hover:text-[#09215F] transition-colors duration-300 flex items-center"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="ml-1 text-sm">
                {expanded ? 'Show Less' : `${addresses.length} addresses`}
              </span>
            </button>
          )}
        </div>

        {/* Selected Address Display */}
        {selectedAddress && !expanded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="bg-[#97CF50] text-white text-xs px-2 py-1 rounded-full mr-2">
                    {selectedAddress.label || 'Default'}
                  </span>
                  {selectedAddress.isDefault && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[#2C3E50]">
                  {selectedAddress.firstName} {selectedAddress.lastName}
                </p>
                <p className="text-[#2C3E50]/80 text-sm">{selectedAddress.address}</p>
                <p className="text-[#2C3E50]/80 text-sm">
                  {selectedAddress.city}, {selectedAddress.province} {selectedAddress.postalCode}
                </p>
                <p className="text-[#2C3E50]/80 text-sm">{selectedAddress.phone}</p>
              </div>
              <button
                onClick={() => setExpanded(true)}
                className="text-[#97CF50] hover:text-[#09215F] transition-colors duration-300"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* All Addresses List */}
        {(expanded || addresses.length <= 1) && (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                  selectedAddress?.id === address.id
                    ? 'border-[#97CF50] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  onAddressSelect(address);
                  setExpanded(false);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mr-2">
                        {address.label || 'Address'}
                      </span>
                      {address.isDefault && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                      {selectedAddress?.id === address.id && (
                        <Check className="h-4 w-4 text-[#97CF50] ml-2" />
                      )}
                    </div>
                    <p className="font-semibold text-[#2C3E50]">
                      {address.firstName} {address.lastName}
                    </p>
                    <p className="text-[#2C3E50]/80 text-sm">{address.address}</p>
                    <p className="text-[#2C3E50]/80 text-sm">
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    <p className="text-[#2C3E50]/80 text-sm">{address.phone}</p>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    {!address.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(address.id!);
                        }}
                        className="text-green-600 hover:text-green-700 text-xs px-2 py-1 border border-green-200 rounded transition-colors duration-300"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(address.id!);
                      }}
                      className="text-red-600 hover:text-red-700 transition-colors duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Address Button */}
        {showAddNew && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-[#97CF50] hover:border-[#97CF50] hover:bg-green-50 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Address
              </button>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-[#2C3E50] mb-4">Add New Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal details - read-only for logged-in users */}
                  {user ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={newAddress.firstName || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">From your profile</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={newAddress.lastName || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">From your profile</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={newAddress.email || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">From your profile</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={newAddress.phone || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">From your profile</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={newAddress.firstName || ''}
                          onChange={(e) => setNewAddress({...newAddress, firstName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={newAddress.lastName || ''}
                          onChange={(e) => setNewAddress({...newAddress, lastName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={newAddress.email || ''}
                          onChange={(e) => setNewAddress({...newAddress, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={newAddress.phone || ''}
                          onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={newAddress.address || ''}
                      onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={newAddress.city || ''}
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={newAddress.postalCode || ''}
                      onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                      Province *
                    </label>
                    <select
                      value={newAddress.province || ''}
                      onChange={(e) => setNewAddress({...newAddress, province: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
                    >
                      <option value="">Select Province</option>
                      {provinces.map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={newAddress.label || ''}
                      onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                      placeholder="e.g., Home, Work"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newAddress.isDefault || false}
                      onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="isDefault" className="text-sm text-[#2C3E50]">
                      Set as default address
                    </label>
                  </div>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={handleAddAddress}
                    className="flex-1 bg-[#97CF50] text-white py-2 px-4 rounded-lg hover:bg-[#09215F] transition-colors duration-300"
                  >
                    Add Address
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAddress({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        address: '',
                        city: '',
                        postalCode: '',
                        province: '',
                        label: 'Home',
                        isDefault: false
                      });
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
