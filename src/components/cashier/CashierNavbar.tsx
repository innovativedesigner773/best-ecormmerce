import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingCart, 
  Menu, 
  X, 
  LogOut, 
  User, 
  Clock,
  Home,
  Receipt,
  Package,
  DollarSign,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CashierNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get user display name with fallback
  const getUserDisplayName = () => {
    return profile?.first_name || user?.user_metadata?.first_name || 'Cashier';
  };

  // Get full user name for profile dropdown
  const getFullUserName = () => {
    const firstName = profile?.first_name || user?.user_metadata?.first_name;
    const lastName = profile?.last_name || user?.user_metadata?.last_name;
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Cashier User';
  };

  const cashierLinks = [
    { to: '/cashier/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/cashier/pos', label: 'POS System', icon: ShoppingCart },
    { to: '/cashier/reports', label: 'Reports', icon: TrendingUp },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gradient-to-r from-[#09215F] to-[#97CF50] shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <Link to="/cashier/dashboard" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="bg-white/20 backdrop-blur-sm text-white p-1.5 sm:p-2 rounded-xl group-hover:bg-white/30 transition-all duration-300 shadow-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-xl font-bold text-white group-hover:text-[#97CF50] transition-colors block truncate">
                  Cashier Portal
                </span>
                <div className="text-xs text-[#97CF50] font-medium hidden sm:block">
                  Best Brightness POS
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {cashierLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActiveLink(link.to)
                      ? 'bg-white/20 text-white shadow-lg transform scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Current Time */}
            <div className="hidden md:flex items-center text-white/80 text-sm">
              <Clock className="h-4 w-4 mr-2" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 text-white hover:bg-white/10 transition-colors rounded-lg sm:rounded-xl"
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="hidden md:block font-medium text-sm sm:text-base">
                  {getUserDisplayName()}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#B0E0E6]/30 z-50">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-[#B0E0E6]/30 bg-gradient-to-r from-[#F8F9FA] to-white">
                      <p className="font-semibold text-[#2C3E50]">
                        {getFullUserName()}
                      </p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                      <p className="text-xs text-[#4682B4] mt-1">Cashier Account</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-sm text-[#2C3E50] hover:bg-[#F8F9FA] hover:text-[#4682B4] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-[#97CF50]" />
                      Profile Settings
                    </Link>
                    <Link
                      to="/cashier/reports"
                      className="flex items-center px-4 py-3 text-sm text-[#2C3E50] hover:bg-[#F8F9FA] hover:text-[#4682B4] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Receipt className="h-4 w-4 mr-3 text-[#97CF50]" />
                      My Sales Report
                    </Link>
                    <Link
                      to="/"
                      className="flex items-center px-4 py-3 text-sm text-[#2C3E50] hover:bg-[#F8F9FA] hover:text-[#4682B4] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Home className="h-4 w-4 mr-3 text-[#97CF50]" />
                      Customer View
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors ml-1 sm:ml-2"
            >
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20">
            <div className="py-4 space-y-2">
              {/* Mobile Navigation Links */}
              {cashierLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center space-x-3 px-4 py-3 transition-colors ${
                      isActiveLink(link.to)
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-white/20 mt-4 pt-4">
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5 mr-3" />
                  Profile Settings
                </Link>
                <Link
                  to="/"
                  className="flex items-center px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Customer View
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-3 text-red-300 hover:bg-red-900/20 hover:text-red-200 transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>
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
