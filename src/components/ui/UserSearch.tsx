'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, ExternalLink, QrCode } from 'lucide-react';
import { Button } from './Button';
import { toast } from 'sonner';

interface UserSearchProps {
  className?: string;
}

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  timezone: string;
}

export function UserSearch({ className = '' }: UserSearchProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const extractIdentifierFromUrl = (input: string): string => {
    // Handle full URLs like http://localhost:3000/profile/user123
    const urlMatch = input.match(/\/profile\/([^/?#]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Handle direct identifiers (username or user ID)
    return input.trim();
  };

  const searchUser = async () => {
    if (!searchInput.trim()) {
      toast.error('Please enter a username, user ID, or profile URL');
      return;
    }

    try {
      setLoading(true);
      setFoundUser(null);
      
      const identifier = extractIdentifierFromUrl(searchInput);
      const response = await fetch(`/api/users/${encodeURIComponent(identifier)}`);
      const data = await response.json();
      
      if (data.success) {
        setFoundUser(data.user);
        toast.success(`Found ${data.user.name}!`);
      } else {
        toast.error('User not found. Please check the username or URL.');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search for user');
    } finally {
      setLoading(false);
    }
  };

  const visitProfile = () => {
    if (foundUser) {
      router.push(`/profile/${foundUser.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchUser();
    }
  };

  const handleQRScan = () => {
    // For now, show a message about QR scanning
    // In a real implementation, you'd integrate with a camera library
    toast.info('QR Scanner feature coming soon! For now, you can paste the profile URL.');
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Search className="h-5 w-5 mr-2 text-blue-600" />
          Find Someone
        </h3>
        <Button
          onClick={handleQRScan}
          variant="outline"
          size="sm"
        >
          <QrCode className="h-4 w-4 mr-2" />
          Scan QR
        </Button>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter username, user ID, or profile URL
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., @username, user123, or https://app.com/profile/user123"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            onClick={searchUser}
            disabled={loading || !searchInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {foundUser && (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {foundUser.avatar ? (
                <img 
                  src={foundUser.avatar} 
                  alt={foundUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {foundUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900">{foundUser.name}</h4>
              {foundUser.username && (
                <p className="text-gray-600">@{foundUser.username}</p>
              )}
              <p className="text-sm text-gray-500">{foundUser.timezone}</p>
            </div>
            
            <Button
              onClick={visitProfile}
              className="bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Profile
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-2">
          How to connect:
        </h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Enter a username (e.g., @john or john)</li>
          <li>• Paste a profile URL someone shared with you</li>
          <li>• Use the QR scanner to scan someone's QR code</li>
          <li>• Visit their profile to see availability and schedule meetings</li>
        </ul>
      </div>

      {/* Example URLs */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800 mb-1">
          <strong>Example formats:</strong>
        </p>
        <div className="text-xs text-blue-700 space-y-1">
          <div>• Username: <code>john</code> or <code>@john</code></div>
          <div>• Profile URL: <code>https://app.com/profile/user123</code></div>
          <div>• User ID: <code>user123</code></div>
        </div>
      </div>
    </div>
  );
}