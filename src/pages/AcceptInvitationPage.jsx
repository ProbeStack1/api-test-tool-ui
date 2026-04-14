import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { acceptInvitation, rejectInvitation } from '../services/workspaceService';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid invitation link – no token provided.');
      setLoading(false);
      return;
    }

    // Check if user is logged in (adjust key as per your auth storage)
    const userId = localStorage.getItem('probestack_user_id');
    if (!userId) {
      // Not logged in – redirect to login page with return URL
      const currentUrl = window.location.href;
      const loginUrl = `https://probestack.io/login?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = loginUrl;
      return; // component will unmount
    }

    // User is logged in – accept the invitation
    const accept = async () => {
      try {
        await acceptInvitation(token);
        setSuccess(true);
        toast.success('You have joined the workspace!');
        let timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate('/workspace/collections');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Invitation could not be accepted.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    accept();
  }, [searchParams, navigate]);

  const handleReject = async () => {
    const token = searchParams.get('token');
    if (!token) return;
    try {
      await rejectInvitation(token);
      toast.info('Invitation rejected');
      navigate('/');
    } catch (err) {
      toast.error('Failed to reject invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-probestack-bg">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-gray-400">Processing your invitation...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-probestack-bg text-center p-4">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to the workspace!</h1>
        <p className="text-gray-400">Redirecting in {countdown} seconds...</p>
        <div className="mt-4 w-48 h-1 bg-dark-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(countdown / 3) * 100}%` }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-probestack-bg text-center p-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Invitation Error</h2>
          <p className="text-gray-300">{error}</p>
          <div className="flex gap-3 mt-4 justify-center">
            <button onClick={handleReject} className="px-4 py-2 bg-dark-700 rounded-md hover:bg-dark-600">
              Dismiss
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary rounded-md hover:bg-primary/90">
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}