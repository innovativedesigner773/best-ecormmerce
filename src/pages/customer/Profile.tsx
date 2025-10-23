import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Gift, Star, Edit2, Save, X, Package, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();

  // Pull latest profile on mount if needed
  useEffect(() => {
    if (user && !userProfile) {
      refreshUserProfile();
    }
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: userProfile?.first_name || '',
    lastName: userProfile?.last_name || '',
    email: user?.email || '',
    phone: userProfile?.phone || '',
  });

  // Keep form in sync when profile loads/changes
  useEffect(() => {
    setFormData({
      firstName: userProfile?.first_name || '',
      lastName: userProfile?.last_name || '',
      email: user?.email || '',
      phone: userProfile?.phone || '',
    });
  }, [userProfile, user?.email]);

  const loyaltyPoints = userProfile?.loyalty_points || 0;
  const totalSpent = (userProfile as any)?.total_spent || 0;

  const loyaltyTiers = [
    { name: 'Bronze', minPoints: 0, color: 'bg-orange-100 text-orange-800 border-orange-200', benefits: ['2% cashback', 'Member discounts'] },
    { name: 'Silver', minPoints: 1000, color: 'bg-gray-100 text-gray-800 border-gray-200', benefits: ['5% cashback', 'Free shipping', 'Priority support'] },
    { name: 'Gold', minPoints: 5000, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', benefits: ['10% cashback', 'Free shipping', 'Exclusive products', 'Birthday bonus'] },
  ];

  const currentTier = loyaltyTiers.reverse().find(tier => loyaltyPoints >= tier.minPoints) || loyaltyTiers[0];
  const nextTier = loyaltyTiers.find(tier => loyaltyPoints < tier.minPoints);
  const progressToNext = nextTier ? (loyaltyPoints / nextTier.minPoints) * 100 : 100;

  const handleSave = async () => {
    try {
      // Minimal update – save basic fields to user_profiles
      if (!user) return;
      const { supabase } = await import('../../lib/supabase');
      await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      await refreshUserProfile();
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: userProfile?.first_name || '',
      lastName: userProfile?.last_name || '',
      email: user?.email || '',
      phone: userProfile?.phone || '',
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-[#09215F]">Loading profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-[#09215F]">Please sign in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#09215F]">My Profile</h1>
              <p className="text-[#09215F]/70 mt-1">Manage your account information and loyalty rewards</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-[#09215F]">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      className="flex items-center bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Header */}
              <div className="flex items-center space-x-6 mb-8 p-6 bg-gradient-to-r from-[#97CF50]/10 to-[#09215F]/10 rounded-2xl border border-[#97CF50]/20">
                <div className="bg-gradient-to-br from-[#97CF50] to-[#09215F] rounded-2xl p-4 shadow-lg">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#09215F]">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </h3>
                  <p className="text-[#09215F]/70 text-lg">Customer since {new Date(userProfile?.created_at || user?.created_at || '').toLocaleDateString()}</p>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-2 ${currentTier.color}`}>
                    <Star className="h-4 w-4 mr-1" />
                    {currentTier.name} Member
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#09215F] mb-3">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-[#09215F] font-medium">{formData.firstName}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#09215F] mb-3">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-[#09215F] font-medium">{formData.lastName}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#09215F] mb-3">
                    Email Address
                  </label>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-[#97CF50]" />
                    <div className="flex-1">
                      <p className="text-[#09215F] font-medium">{formData.email}</p>
                      <p className="text-xs text-[#09215F]/60 mt-1">Email cannot be changed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#09215F] mb-3">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                      placeholder="+27 12 345 6789"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-[#97CF50]" />
                      <p className="text-[#09215F] font-medium">{formData.phone || 'Not provided'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-[#09215F] mb-8">Account Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary rounded-xl p-3 shadow-lg">
                      <Gift className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-[#09215F] mb-1">{loyaltyPoints.toLocaleString()}</h3>
                  <p className="text-[#09215F]/70 font-medium">Loyalty Points</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-600 rounded-xl p-3 shadow-lg">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-[#09215F] mb-1">R{totalSpent.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</h3>
                  <p className="text-[#09215F]/70 font-medium">Total Spent</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-600 rounded-xl p-3 shadow-lg">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-[#09215F] mb-1">24</h3>
                  <p className="text-[#09215F]/70 font-medium">Orders Placed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Loyalty Program */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-[#09215F] mb-6">Loyalty Program</h2>
              
              {/* Current Tier */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#09215F]">Current Tier</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentTier.color}`}>
                    {currentTier.name}
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-[#09215F]/70 mb-2">
                    <span className="font-medium">{loyaltyPoints.toLocaleString()} points</span>
                    {nextTier && <span className="font-medium">{nextTier.minPoints.toLocaleString()} points</span>}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-[#97CF50] to-[#09215F] h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressToNext, 100)}%` }}
                    />
                  </div>
                  {nextTier && (
                    <p className="text-xs text-[#09215F]/60 mt-2 font-medium">
                      {(nextTier.minPoints - loyaltyPoints).toLocaleString()} points to reach {nextTier.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Current Benefits */}
              <div className="mb-6">
                <h3 className="font-bold text-[#09215F] mb-3">Your Benefits</h3>
                <div className="space-y-2">
                  {currentTier.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center text-sm text-[#09215F]/80 bg-gray-50 rounded-lg p-2">
                      <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Tiers */}
              <div>
                <h3 className="font-bold text-[#09215F] mb-4">All Tiers</h3>
                <div className="space-y-3">
                  {loyaltyTiers.reverse().map((tier) => (
                    <div 
                      key={tier.name}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        tier.name === currentTier.name 
                          ? 'border-[#97CF50] bg-gradient-to-r from-[#97CF50]/10 to-[#09215F]/10 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#09215F]">{tier.name}</span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${tier.color}`}>
                          {tier.minPoints.toLocaleString()}+ pts
                        </span>
                      </div>
                      <div className="text-xs text-[#09215F]/70 space-y-1">
                        {tier.benefits.slice(0, 2).map((benefit, index) => (
                          <div key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-[#09215F] mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#97CF50] hover:bg-gradient-to-r hover:from-[#97CF50]/5 hover:to-[#09215F]/5 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5 text-[#97CF50] group-hover:text-[#09215F]" />
                      <span className="text-sm font-semibold text-[#09215F]">Change Password</span>
                    </div>
                    <svg className="h-4 w-4 text-[#09215F]/40 group-hover:text-[#97CF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                <button className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#97CF50] hover:bg-gradient-to-r hover:from-[#97CF50]/5 hover:to-[#09215F]/5 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-[#97CF50] group-hover:text-[#09215F]" />
                      <span className="text-sm font-semibold text-[#09215F]">Notification Settings</span>
                    </div>
                    <svg className="h-4 w-4 text-[#09215F]/40 group-hover:text-[#97CF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                <button className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#97CF50] hover:bg-gradient-to-r hover:from-[#97CF50]/5 hover:to-[#09215F]/5 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-[#97CF50] group-hover:text-[#09215F]" />
                      <span className="text-sm font-semibold text-[#09215F]">Address Book</span>
                    </div>
                    <svg className="h-4 w-4 text-[#09215F]/40 group-hover:text-[#97CF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}