import React from 'react';
import { PromotionsManagement } from '../../components/admin/PromotionsManagement';

export default function AdminPromotions() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PromotionsManagement />
      </div>
    </div>
  );
}