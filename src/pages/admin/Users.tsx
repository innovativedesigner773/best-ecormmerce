import React, { useMemo, useState } from 'react';
import { Users, Search, Filter, UserPlus } from 'lucide-react';
import AddStaffModal from '../../components/admin/AddStaffModal';
import UserList from '../../components/admin/UserList';

export default function AdminUsers() {
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'cashier' | 'staff' | 'manager' | 'admin'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearch = useDebouncedValue(search, 250);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C3E50]">Users</h1>
            <p className="text-[#6C757D] mt-2">Manage customers and staff accounts</p>
          </div>
          <button onClick={() => setOpenAdd(true)} className="bg-[#97CF50] text-white px-5 py-3 h-11 rounded-xl text-sm font-medium hover:bg-[#09215F] transition-all duration-300 inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-lg">
            <UserPlus className="h-5 w-5" />
            Add User
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#97CF50] bg-white">
                  <option value="all">All roles</option>
                  <option value="customer">Customer</option>
                  <option value="cashier">Cashier</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          <UserList key={refreshKey} search={debouncedSearch} roleFilter={roleFilter} />
        </div>
      </div>
      <AddStaffModal open={openAdd} onClose={() => setOpenAdd(false)} onCreated={() => setRefreshKey(k => k + 1)} />
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}