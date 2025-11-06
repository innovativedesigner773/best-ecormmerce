import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, LogOut, Settings, Package, BarChart3, Users, Sparkles, Heart, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavourites } from '../../contexts/FavouritesContext';
import { useStockNotifications } from '../../contexts/StockNotificationsContext';
import CartIcon from './CartIcon';
import ShareableCartNotifications from './ShareableCartNotifications';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, signOut, isAtLeastRole } = useAuth();
  const { items: favouriteItems } = useFavourites();
  const { notifications } = useStockNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false); // Close mobile menu after search
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const navigationLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Products' },
    { to: '/contact', label: 'Contact' },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3 },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/promotions', label: 'Promotions', icon: Settings },
    { to: '/admin/orders', label: 'Orders', icon: Package },
    { to: '/admin/users', label: 'Users', icon: Users },
  ];

  const cashierLinks = [
    { to: '/cashier', label: 'Dashboard', icon: BarChart3 },
    { to: '/cashier/pos', label: 'POS System', icon: Settings },
    { to: '/cashier/reports', label: 'Reports', icon: BarChart3 },
  ];

  // Get user display name with fallback
  const getUserDisplayName = () => {
    return profile?.first_name || user?.user_metadata?.first_name || 'Profile';
  };

  // Get full user name for profile dropdown
  const getFullUserName = () => {
    const firstName = profile?.first_name || user?.user_metadata?.first_name;
    const lastName = profile?.last_name || user?.user_metadata?.last_name;
    return `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  };

  // Get loyalty points
  const getLoyaltyPoints = () => {
    return profile?.loyalty_points || user?.user_metadata?.loyalty_points || 0;
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-50 border-b border-[#B0E0E6]/30 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: Two-row layout, Desktop: Single row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          {/* First Row: Logo and Icons */}
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center group flex-shrink-0">
              <div className="bg-gradient-to-br from-[#97CF50] to-[#97CF50] text-white p-1.5 sm:p-2 rounded-xl group-hover:scale-105 transition-transform duration-300 shadow-lg">
                <img 
                  src="/assets/icon.png" 
                  alt="Best Brightness Logo" 
                  className="h-8 w-20 sm:h-10 sm:w-25 object-contain"
                />
              </div>
            </Link>
          
            {/* Mobile Icons Row - All icons visible on mobile */}
            <div className="flex md:hidden items-center gap-1">
              {/* Favourites */}
              <Link
                to="/favourites"
                className="relative p-1.5 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Favourites"
              >
                <Heart className="h-5 w-5" />
                {favouriteItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {favouriteItems.length > 9 ? '9+' : favouriteItems.length}
                  </span>
                )}
              </Link>

              {/* Stock Notifications - Only for authenticated users */}
              {user && (
                <Link
                  to="/notifications"
                  className="relative p-1.5 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-lg transition-all"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.filter(n => !n.is_notified).length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                      {notifications.filter(n => !n.is_notified).length > 9 ? '9+' : notifications.filter(n => !n.is_notified).length}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart Icon */}
              <CartIcon />

              {/* Shareable Cart Notifications */}
              {user && <ShareableCartNotifications />}

              {/* User Profile or Auth Buttons - Mobile */}
              {user ? (
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center p-1.5 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="bg-gradient-to-br from-[#97CF50] to-[#97CF50] rounded-full p-1">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </button>
              ) : null}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-lg transition-colors ml-1"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Second Row: Auth Buttons (Mobile only, when not logged in) */}
          {!user && (
            <div className="flex md:hidden items-center justify-center gap-2 pb-3 pt-1">
              <Link
                to="/login"
                className="text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] px-4 py-2 rounded-lg transition-colors font-medium hover:bg-[#F8F9FA] dark:hover:bg-gray-800 text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white px-4 py-2 rounded-lg hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 font-medium shadow-lg text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] px-3 py-2 rounded-lg transition-colors font-medium hover:bg-[#F8F9FA] dark:hover:bg-gray-800"
              >
                {link.label}
              </Link>
            ))}

            {/* Admin/Cashier Links */}
            {isAtLeastRole('cashier') && (
              <div className="relative group">
                <button className="text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] px-3 py-2 rounded-lg transition-colors flex items-center font-medium hover:bg-[#F8F9FA] dark:hover:bg-gray-800">
                  Dashboard
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-[#B0E0E6]/30 dark:border-gray-700 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {isAtLeastRole('admin') && adminLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <link.icon className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                      {link.label}
                    </Link>
                  ))}
                  {isAtLeastRole('cashier') && !isAtLeastRole('admin') && cashierLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <link.icon className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search cleaning products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-10 py-2 border border-[#B0E0E6] dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent bg-[#F8F9FA]/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 transition-colors text-[#09215F] dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-[#97CF50] dark:text-green-400" />
              {searchQuery && (
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="absolute right-3 top-2.5 text-[#97CF50] dark:text-green-400 hover:text-[#09215F] dark:hover:text-white transition-colors"
                  title="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Side - Desktop only */}
          <div className="hidden md:flex items-center space-x-2 md:space-x-4">
            {/* Favourites Icon */}
            <Link
              to="/favourites"
              className="relative p-2 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-xl transition-all duration-300 group"
              title="Favourites"
            >
              <Heart className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {favouriteItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                  {favouriteItems.length > 9 ? '9+' : favouriteItems.length}
                </span>
              )}
            </Link>

            {/* Stock Notifications Icon - Only for authenticated users */}
            {user && (
              <Link
                to="/notifications"
                className="relative p-2 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-xl transition-all duration-300 group"
                title="Stock Notifications"
              >
                <Bell className="h-6 w-6 group-hover:scale-110 transition-transform" />
                {notifications.filter(n => !n.is_notified).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {notifications.filter(n => !n.is_notified).length > 9 ? '9+' : notifications.filter(n => !n.is_notified).length}
                  </span>
                )}
              </Link>
            )}

            {/* Cart Icon - Always visible */}
            <CartIcon />

            {/* Shareable Cart Notifications - Only for authenticated users */}
            {user && <ShareableCartNotifications />}

            {user ? (
              <>
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-1 sm:space-x-2 p-2 text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] transition-colors hover:bg-[#F8F9FA] dark:hover:bg-gray-800 rounded-xl"
                  >
                    <div className="bg-gradient-to-br from-[#97CF50] to-[#97CF50] rounded-full p-1">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <span className="hidden md:block font-medium">
                      {getUserDisplayName()}
                    </span>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-[#B0E0E6]/30 dark:border-gray-700 z-50">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-[#B0E0E6]/30 dark:border-gray-700 bg-gradient-to-r from-[#F8F9FA] to-white dark:from-gray-700 dark:to-gray-800">
                          <p className="font-semibold text-[#09215F] dark:text-white">
                            {getFullUserName()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                          <div className="flex items-center mt-2">
                            <Sparkles className="h-3 w-3 text-[#97CF50] dark:text-green-400 mr-1" />
                            <span className="text-sm text-[#97CF50] dark:text-green-400 font-medium">
                              {getLoyaltyPoints()} points
                            </span>
                          </div>
                        </div>
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                          Profile Settings
                        </Link>
                        <Link
                          to="/favourites"
                          className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Heart className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                          My Favourites ({favouriteItems.length})
                        </Link>
                        <Link
                          to="/notifications"
                          className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Bell className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                          Stock Notifications ({notifications.filter(n => !n.is_notified).length})
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center px-4 py-3 text-sm text-[#09215F] dark:text-gray-300 hover:bg-[#F8F9FA] dark:hover:bg-gray-700 hover:text-[#97CF50] transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Package className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                          Order History
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 md:space-x-3">
                <Link
                  to="/login"
                  className="text-[#09215F] dark:text-gray-300 hover:text-[#97CF50] px-3 md:px-4 py-2 rounded-lg transition-colors font-medium hover:bg-[#F8F9FA] dark:hover:bg-gray-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white px-4 md:px-6 py-2 rounded-lg hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#B0E0E6]/30 dark:border-gray-700">
            <div className="py-4 space-y-2">
              {/* Search */}
              <div className="px-4 pb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search cleaning products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full pl-10 pr-10 py-2 border border-[#B0E0E6] dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] bg-[#F8F9FA]/50 dark:bg-gray-800 text-[#09215F] dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-[#97CF50] dark:text-green-400" />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      className="absolute right-3 top-2.5 text-[#97CF50] dark:text-green-400 hover:text-[#09215F] dark:hover:text-white transition-colors"
                      title="Search"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Favourites */}
              <div className="px-4 pb-2">
                <Link
                  to="/favourites"
                  className="flex items-center justify-between w-full p-3 bg-[#F8F9FA] dark:bg-gray-800 hover:bg-[#B0E0E6]/20 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-[#97CF50] dark:text-green-400 mr-3" />
                    <span className="font-medium text-[#09215F] dark:text-gray-200">My Favourites</span>
                  </div>
                  {favouriteItems.length > 0 && (
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {favouriteItems.length}
                    </span>
                  )}
                </Link>
              </div>

              {/* Mobile Stock Notifications - Only for authenticated users */}
              {user && (
                <div className="px-4 pb-2">
                  <Link
                    to="/notifications"
                    className="flex items-center justify-between w-full p-3 bg-[#F8F9FA] dark:bg-gray-800 hover:bg-[#B0E0E6]/20 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-[#97CF50] dark:text-green-400 mr-3" />
                      <span className="font-medium text-[#09215F] dark:text-gray-200">Stock Notifications</span>
                    </div>
                    {notifications.filter(n => !n.is_notified).length > 0 && (
                      <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {notifications.filter(n => !n.is_notified).length}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              {/* Mobile Cart */}
              <div className="px-4 pb-2">
                <CartIcon className="w-full" />
              </div>

              {/* Navigation Links */}
              {navigationLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-4 py-3 text-[#09215F] dark:text-gray-200 hover:bg-[#F8F9FA] dark:hover:bg-gray-800 hover:text-[#97CF50] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Admin/Cashier Links */}
              {isAtLeastRole('admin') && adminLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center px-4 py-3 text-[#09215F] dark:text-gray-200 hover:bg-[#F8F9FA] dark:hover:bg-gray-800 hover:text-[#97CF50] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <link.icon className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                  {link.label}
                </Link>
              ))}
              {isAtLeastRole('cashier') && !isAtLeastRole('admin') && cashierLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center px-4 py-3 text-[#09215F] dark:text-gray-200 hover:bg-[#F8F9FA] dark:hover:bg-gray-800 hover:text-[#97CF50] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <link.icon className="h-4 w-4 mr-3 text-[#97CF50] dark:text-green-400" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close profile dropdown */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsProfileOpen(false)}
        />
      )}
    </nav>
  );
}