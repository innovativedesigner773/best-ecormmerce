import { supabase } from '../lib/supabase';

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  isDefault?: boolean;
  label?: string; // e.g., "Home", "Work", "Other"
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressServiceResult {
  success: boolean;
  data?: Address | Address[];
  error?: string;
}

export class AddressService {
  /**
   * Get all addresses for a user
   */
  static async getUserAddresses(userId: string): Promise<AddressServiceResult> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('address')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user addresses:', error);
        return { success: false, error: 'Failed to fetch addresses' };
      }

      // Parse addresses from JSONB field
      const addresses = profile?.address ? 
        (Array.isArray(profile.address.addresses) ? profile.address.addresses : []) : [];

      return { success: true, data: addresses };
    } catch (error) {
      console.error('Unexpected error fetching addresses:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get the default address for a user
   */
  static async getDefaultAddress(userId: string): Promise<AddressServiceResult> {
    try {
      const result = await this.getUserAddresses(userId);
      if (!result.success || !result.data) {
        return result;
      }

      const addresses = result.data as Address[];
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      
      return { success: true, data: defaultAddress };
    } catch (error) {
      console.error('Unexpected error fetching default address:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Save addresses for a user
   */
  static async saveUserAddresses(userId: string, addresses: Address[]): Promise<AddressServiceResult> {
    try {
      // Ensure only one default address
      const processedAddresses = addresses.map((addr, index) => ({
        ...addr,
        isDefault: index === 0 || addr.isDefault, // First address or explicitly marked as default
        updatedAt: new Date().toISOString(),
      }));

      // Remove isDefault from all other addresses
      let hasDefault = false;
      const finalAddresses = processedAddresses.map(addr => {
        if (addr.isDefault && hasDefault) {
          return { ...addr, isDefault: false };
        }
        if (addr.isDefault) {
          hasDefault = true;
        }
        return addr;
      });

      const { error } = await supabase
        .from('user_profiles')
        .update({
          address: { addresses: finalAddresses },
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error saving addresses:', error);
        return { success: false, error: 'Failed to save addresses' };
      }

      return { success: true, data: finalAddresses };
    } catch (error) {
      console.error('Unexpected error saving addresses:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Add a new address for a user
   */
  static async addAddress(userId: string, address: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>): Promise<AddressServiceResult> {
    try {
      const result = await this.getUserAddresses(userId);
      if (!result.success) {
        return result;
      }

      const existingAddresses = result.data as Address[] || [];
      const newAddress: Address = {
        ...address,
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If this is the first address or marked as default, make it default
      if (existingAddresses.length === 0 || address.isDefault) {
        newAddress.isDefault = true;
        // Remove default from other addresses
        existingAddresses.forEach(addr => addr.isDefault = false);
      }

      const updatedAddresses = [...existingAddresses, newAddress];
      return await this.saveUserAddresses(userId, updatedAddresses);
    } catch (error) {
      console.error('Unexpected error adding address:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update an existing address
   */
  static async updateAddress(userId: string, addressId: string, updates: Partial<Address>): Promise<AddressServiceResult> {
    try {
      const result = await this.getUserAddresses(userId);
      if (!result.success || !result.data) {
        return result;
      }

      const addresses = result.data as Address[];
      const addressIndex = addresses.findIndex(addr => addr.id === addressId);
      
      if (addressIndex === -1) {
        return { success: false, error: 'Address not found' };
      }

      const updatedAddress = {
        ...addresses[addressIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      addresses[addressIndex] = updatedAddress;

      // If this address is being set as default, remove default from others
      if (updates.isDefault) {
        addresses.forEach((addr, index) => {
          if (index !== addressIndex) {
            addr.isDefault = false;
          }
        });
      }

      return await this.saveUserAddresses(userId, addresses);
    } catch (error) {
      console.error('Unexpected error updating address:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete an address
   */
  static async deleteAddress(userId: string, addressId: string): Promise<AddressServiceResult> {
    try {
      const result = await this.getUserAddresses(userId);
      if (!result.success || !result.data) {
        return result;
      }

      const addresses = result.data as Address[];
      const addressToDelete = addresses.find(addr => addr.id === addressId);
      
      if (!addressToDelete) {
        return { success: false, error: 'Address not found' };
      }

      const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
      
      // If we deleted the default address and there are remaining addresses, make the first one default
      if (addressToDelete.isDefault && remainingAddresses.length > 0) {
        remainingAddresses[0].isDefault = true;
      }

      return await this.saveUserAddresses(userId, remainingAddresses);
    } catch (error) {
      console.error('Unexpected error deleting address:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Set an address as default
   */
  static async setDefaultAddress(userId: string, addressId: string): Promise<AddressServiceResult> {
    return await this.updateAddress(userId, addressId, { isDefault: true });
  }
}
