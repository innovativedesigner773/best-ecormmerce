import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Sparkles, Award, Truck, Clock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#09215F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-[#97CF50] to-[#97CF50] text-white p-2 rounded-xl shadow-lg">
                <img 
                  src="/assets/icon.png" 
                  alt="Best Brightness Logo" 
                  className="h-8 w-16 object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-bold">Best Brightness</span>
                <div className="text-xs text-[#97CF50] font-medium">
                  Professional Cleaning
                </div>
              </div>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Your trusted partner for premium cleaning supplies and solutions across Durban. 
              Quality products, competitive prices, exceptional service since 2015.
            </p>
            
            {/* Vision Statement */}
            <div className="mb-6 p-3 bg-[#97CF50]/10 rounded-lg border-l-4 border-[#97CF50]">
              <div className="text-[#97CF50] font-semibold text-sm mb-1">Our Vision</div>
              <div className="text-gray-300 text-sm italic">
                "Big Value, Great Save, always on sale"
              </div>
            </div>
            
            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center space-x-2 text-sm text-[#97CF50]">
                <Award className="h-4 w-4" />
                <span>Quality Certified</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-[#97CF50]">
                <Truck className="h-4 w-4" />
                <span>Fast Delivery</span>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#97CF50] transition-colors p-2 hover:bg-[#97CF50]/20 rounded-lg">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#97CF50] transition-colors p-2 hover:bg-[#97CF50]/20 rounded-lg">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#97CF50] transition-colors p-2 hover:bg-[#97CF50]/20 rounded-lg">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#97CF50] transition-colors p-2 hover:bg-[#97CF50]/20 rounded-lg">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#97CF50]">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Products
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  About Us
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Contact
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Bulk Orders
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Commercial Solutions
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#97CF50]">Customer Service</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Loyalty Program
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Product Safety Guides
                </a>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white transition-colors hover:pl-2 duration-200">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#97CF50]">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-[#97CF50] mt-0.5 flex-shrink-0" />
                <div className="text-gray-300">
                  <div className="font-medium text-white mb-1">Our Locations</div>
                  <div className="text-sm">
                    Pongola shop 4A<br />
                    Nquthu shop No.15<br />
                    (Two branches)
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-[#97CF50]" />
                <div>
                  <div className="text-white font-medium">+27 31 123 4567</div>
                  <div className="text-sm text-gray-400">24/7 Support Line</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-[#97CF50]" />
                <div>
                  <div className="text-white font-medium">BestBrightness.sales@gmail.com</div>
                  <div className="text-sm text-gray-400">Sales Inquiries</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-[#97CF50]/20 rounded-xl border border-[#97CF50]/30">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-[#97CF50]" />
                <h4 className="font-semibold text-[#97CF50]">Business Hours</h4>
              </div>
              <div className="text-gray-300 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Mon-Fri:</span>
                  <span>8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>9:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#97CF50]/30 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              <p className="text-gray-400 text-sm">
                © {currentYear} Best Brightness. All rights reserved.
              </p>
              <div className="flex items-center space-x-2 text-xs text-[#97CF50]">
                <Sparkles className="h-3 w-3" />
                <span>Proudly serving Durban since 2015</span>
              </div>
            </div>
            <div className="flex space-x-6">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-[#97CF50] text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-[#97CF50] text-sm transition-colors">
                Terms of Service
              </Link>
              <a href="#" className="text-gray-400 hover:text-[#97CF50] text-sm transition-colors">
                Cookie Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-[#97CF50] text-sm transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}