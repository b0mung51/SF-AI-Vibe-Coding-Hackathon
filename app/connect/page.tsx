'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Clock, Check, X, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ProfileShare } from '@/src/components/ui/ProfileShare';
import { UserSearch } from '@/src/components/ui/UserSearch';
import { toast } from 'sonner';

interface Connection {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  targetId: string;
  targetName: string;
  targetEmail: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export default function ConnectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'connected'>('discover');

  useEffect(() => {
    if (session?.user?.email) {
      fetchConnections();
    }
  }, [session]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/connections/request');
      const data = await response.json();
      
      if (data.success) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionAction = async (connectionId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Connection ${action}ed successfully!`);
        fetchConnections(); // Refresh the list
      } else {
        toast.error(data.error || `Failed to ${action} connection`);
      }
    } catch (error) {
      console.error(`Error ${action}ing connection:`, error);
      toast.error(`Failed to ${action} connection`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const pendingRequests = connections.filter(c => 
    c.status === 'pending' && c.targetId === session?.user?.id
  );
  
  const sentRequests = connections.filter(c => 
    c.status === 'pending' && c.requesterId === session?.user?.id
  );
  
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to connect with others.</p>
          <Button onClick={() => router.push('/auth/signin')} className="bg-blue-600 hover:bg-blue-700">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect & Collaborate</h1>
          <p className="text-gray-600">Discover people, share your profile, and manage connections for seamless meeting scheduling.</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-xl mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'discover', label: 'Discover', icon: UserPlus },
                { id: 'requests', label: 'Requests', icon: Clock, count: pendingRequests.length },
                { id: 'connected', label: 'Connected', icon: Users, count: acceptedConnections.length }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <UserSearch />
                  <ProfileShare />
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Pending Requests (Received) */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
                    <div className="space-y-4">
                      {pendingRequests.map((connection) => (
                        <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {connection.requesterName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{connection.requesterName}</h4>
                                <p className="text-sm text-gray-600">{connection.requesterEmail}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(connection.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleConnectionAction(connection.id, 'accept')}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                onClick={() => handleConnectionAction(connection.id, 'decline')}
                                variant="outline"
                                size="sm"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </div>
                          {connection.message && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{connection.message}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sent Requests</h3>
                    <div className="space-y-4">
                      {sentRequests.map((connection) => (
                        <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {connection.targetName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{connection.targetName}</h4>
                                <p className="text-sm text-gray-600">{connection.targetEmail}</p>
                                <p className="text-xs text-gray-500 mt-1">Sent {formatDate(connection.createdAt)}</p>
                              </div>
                            </div>
                            <div className="text-sm text-yellow-600 font-medium">
                              Pending
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending connection requests.</p>
                  </div>
                )}
              </div>
            )}

            {/* Connected Tab */}
            {activeTab === 'connected' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Connections</h3>
                {acceptedConnections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {acceptedConnections.map((connection) => {
                      const isRequester = connection.requesterId === session.user.id;
                      const otherUser = isRequester 
                        ? { name: connection.targetName, email: connection.targetEmail, id: connection.targetId }
                        : { name: connection.requesterName, email: connection.requesterEmail, id: connection.requesterId };
                      
                      return (
                        <div key={connection.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl font-bold text-white">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">{otherUser.name}</h4>
                            <p className="text-sm text-gray-600 mb-3">{otherUser.email}</p>
                            <Button
                              onClick={() => router.push(`/profile/${otherUser.id}`)}
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Meeting
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No connections yet. Start by discovering and connecting with others!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
