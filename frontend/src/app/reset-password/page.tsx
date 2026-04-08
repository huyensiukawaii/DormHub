import { Suspense } from 'react';
import ResetPasswordPage from '@/pages/Auth/ResetPassword/reset-password';

export default function Page() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-white" />}> 
			<ResetPasswordPage />
		</Suspense>
	);
}
