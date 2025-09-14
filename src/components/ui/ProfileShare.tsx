'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { QrCode, Copy, Share2, Download, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import { toast } from 'sonner';

interface ProfileShareProps {
  className?: string;
}

export function ProfileShare({ className = '' }: ProfileShareProps) {
  const { data: session } = useSession();
  const [profileUrl, setProfileUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/profile/${session.user.id}`;
      setProfileUrl(url);
      generateQRCode(url);
    }
  }, [session]);

  const generateQRCode = async (url: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl: url, size: 256 })
      });
      
      const data = await response.json();
      if (data.success) {
        setQrCode(data.qrCode);
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Profile URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy URL');
    }
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${session?.user?.name}`,
          text: `Schedule a meeting with me using this link:`,
          url: profileUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;
    
    const link = document.createElement('a');
    link.download = `${session?.user?.name || 'profile'}-qr-code.png`;
    link.href = qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  const openProfile = () => {
    window.open(profileUrl, '_blank');
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Share2 className="h-5 w-5 mr-2 text-blue-600" />
          Share Your Profile
        </h3>
        <Button
          onClick={() => setShowQR(!showQR)}
          variant="outline"
          size="sm"
        >
          <QrCode className="h-4 w-4 mr-2" />
          {showQR ? 'Hide QR' : 'Show QR'}
        </Button>
      </div>

      {/* Profile URL Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Profile URL
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono">
            {profileUrl}
          </div>
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            onClick={openProfile}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          onClick={shareProfile}
          className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Profile
        </Button>
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="border-t border-gray-200 pt-6">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              QR Code
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : qrCode ? (
              <div className="inline-block">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                  <img 
                    src={qrCode} 
                    alt="Profile QR Code" 
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                Failed to generate QR code
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-2">
          How it works:
        </h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Share your profile URL or QR code with others</li>
          <li>• They can view your availability and schedule meetings</li>
          <li>• Automatic calendar sync when they connect with you</li>
          <li>• No need to exchange emails or phone numbers</li>
        </ul>
      </div>
    </div>
  );
}