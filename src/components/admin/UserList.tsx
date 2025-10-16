import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, RefreshCw } from 'lucide-react';

export interface UserRow {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: 'customer' | 'cashier' | 'staff' | 'manager' | 'admin';
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

interface UserListProps {
	search: string;
	roleFilter: 'all' | 'customer' | 'cashier' | 'staff' | 'manager' | 'admin';
	onRefreshed?: () => void;
}

export default function UserList({ search, roleFilter, onRefreshed }: UserListProps) {
	const [users, setUsers] = useState<UserRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchUsers = async () => {
		setLoading(true);
		setError(null);
		try {
			let query = supabase
				.from('user_profiles')
				.select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
				.order('created_at', { ascending: false });

			if (roleFilter !== 'all') {
				query = query.eq('role', roleFilter);
			}

			const { data, error } = await query;
			if (error) throw error;
			setUsers((data || []) as unknown as UserRow[]);
			onRefreshed && onRefreshed();
		} catch (e: any) {
			setError(e.message || 'Failed to load users');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roleFilter]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return users;
		return users.filter(u =>
			(u.email || '').toLowerCase().includes(q) ||
			(u.first_name || '').toLowerCase().includes(q) ||
			(u.last_name || '').toLowerCase().includes(q)
		);
	}, [users, search]);

	const toggleActive = async (userId: string, next: boolean) => {
		try {
			const { error } = await supabase
				.from('user_profiles')
				.update({ is_active: next, updated_at: new Date().toISOString() })
				.eq('id', userId);
			if (error) throw error;
			setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: next } as UserRow : u));
		} catch (e: any) {
			setError(e.message || 'Failed to update user');
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-sm text-gray-600">{filtered.length} users</h3>
				<button onClick={fetchUsers} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded border hover:bg-gray-50">
					<RefreshCw className="h-4 w-4" /> Refresh
				</button>
			</div>

			{error && (
				<div className="mb-4 text-red-600 text-sm">{error}</div>
			)}

			<div className="overflow-x-auto border rounded-lg">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
							<th className="px-4 py-2" />
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{loading ? (
							<tr>
								<td colSpan={5} className="px-4 py-10 text-center text-gray-500">Loading users...</td>
							</tr>
						) : (
							filtered.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-10 text-center text-gray-500">
										<div className="flex flex-col items-center gap-2">
											<div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
												<Users className="h-6 w-6 text-gray-400" />
											</div>
											<span>No users found</span>
										</div>
									</td>
								</tr>
							) : (
								filtered.map(u => (
									<tr key={u.id} className="hover:bg-gray-50">
										<td className="px-4 py-2 whitespace-nowrap">{u.first_name} {u.last_name}</td>
										<td className="px-4 py-2 whitespace-nowrap">{u.email}</td>
										<td className="px-4 py-2 whitespace-nowrap capitalize">{u.role}</td>
										<td className="px-4 py-2 whitespace-nowrap">
											<span className={`px-2 py-1 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
										</td>
										<td className="px-4 py-2 text-right">
											<button onClick={() => toggleActive(u.id, !u.is_active)} className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50">
												{u.is_active ? 'Deactivate' : 'Activate'}
											</button>
										</td>
									</tr>
								))
							)
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}


