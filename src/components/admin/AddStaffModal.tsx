import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AddStaffModalProps {
	open: boolean;
	onClose: () => void;
	onCreated: () => void;
}

export default function AddStaffModal({ open, onClose, onCreated }: AddStaffModalProps) {
	const { signUp, loading } = useAuth();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState<'cashier' | 'admin'>('cashier');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	if (!open) return null;

	const reset = () => {
		setFirstName('');
		setLastName('');
		setEmail('');
		setPassword('');
		setRole('cashier');
		setError(null);
		setSuccess(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!firstName || !lastName || !email || !password) {
			setError('Please fill in all required fields');
			return;
		}

		const res = await signUp(email.trim(), password, firstName.trim(), lastName.trim(), role);
		if (!res.success) {
			setError(res.error || 'Failed to create user');
			return;
		}

		setSuccess(res.requiresConfirmation
			? 'User created. A confirmation email has been sent.'
			: 'User created successfully.');
		onCreated();
		reset();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
				<div className="flex items-center justify-between p-5 border-b">
					<h3 className="text-xl font-semibold text-[#2C3E50]">Add Staff User</h3>
					<button onClick={() => { reset(); onClose(); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
						<X className="h-5 w-5 text-[#2C3E50]" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-5 space-y-4">
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
					)}
					{success && (
						<div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{success}</div>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm text-[#2C3E50] mb-1">First name</label>
							<input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent" placeholder="John" />
						</div>
						<div>
							<label className="block text-sm text-[#2C3E50] mb-1">Last name</label>
							<input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent" placeholder="Doe" />
						</div>
					</div>

					<div>
						<label className="block text-sm text-[#2C3E50] mb-1">Email</label>
						<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent" placeholder="john@example.com" />
					</div>

					<div>
						<label className="block text-sm text-[#2C3E50] mb-1">Password</label>
						<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent" placeholder="******" />
					</div>

					<div>
						<label className="block text-sm text-[#2C3E50] mb-1">Role</label>
						<select value={role} onChange={(e) => setRole(e.target.value as 'cashier' | 'admin')} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent bg-white">
							<option value="cashier">Cashier</option>
							<option value="admin">Administrator</option>
						</select>
					</div>

					<div className="flex items-center justify-end gap-3 pt-2">
						<button type="button" onClick={() => { reset(); onClose(); }} className="px-5 py-3 h-11 rounded-xl text-sm font-medium border border-[#4682B4] text-[#4682B4] hover:bg-[#4682B4] hover:text-white transition-all duration-300 inline-flex items-center justify-center whitespace-nowrap">
							Cancel
						</button>
						<button type="submit" disabled={loading} className="px-5 py-3 h-11 rounded-xl text-sm font-medium bg-[#4682B4] text-white hover:bg-[#2C3E50] disabled:opacity-60 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center justify-center whitespace-nowrap">
							{loading ? 'Creating...' : 'Create user'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}


