'use client';

import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Plus, X, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  timezone?: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
  confidence: number;
  availableUsers: string[];
  conflictingUsers: string[];
  reason: string;
  type: string;
}

interface MultiUserSchedulerProps {
  onScheduleMeeting?: (slot: AvailabilitySlot, selectedUsers: User[]) => void;
  className?: string;
}

export function MultiUserScheduler({ onScheduleMeeting, className = '' }: MultiUserSchedulerProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [duration, setDuration] = useState(60);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Mock users data - in real app, this would come from your user database
  const mockUsers: User[] = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', timezone: 'UTC-8' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', timezone: 'UTC-5' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', timezone: 'UTC+1' },
    { id: '4', name: 'David Wilson', email: 'david@example.com', timezone: 'UTC-7' },
    { id: '5', name: 'Eva Brown', email: 'eva@example.com', timezone: 'UTC+2' },
  ];

  useEffect(() => {
    setAvailableUsers(mockUsers);
  }, []);

  const filteredUsers = availableUsers.filter(user => 
    !selectedUsers.find(selected => selected.id === user.id) &&
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
    setShowUserSearch(false);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const findMutualAvailability = async () => {
    if (selectedUsers.length < 2) {
      setError('Please select at least 2 users to find mutual availability');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/availability/mutual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers.map(user => user.id),
          duration,
          preferredTimeRange: { start: '09:00', end: '17:00' },
          excludeDays: [0, 6], // Exclude weekends
          lookAheadDays: 14,
          requireAllUsers: true
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to find mutual availability');
      }

      setAvailabilitySlots(data.availableSlots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Multi-User Scheduling</h2>
          <p className="text-sm text-gray-600">Find the best time for everyone to meet</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">{selectedUsers.length} selected</span>
        </div>
      </div>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Selected Users:</label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="hover:bg-blue-100 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add User */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Participant
              </Button>
            </div>

            {showUserSearch && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
                {filteredUsers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => addUser(user)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        {user.timezone && (
                          <span className="text-xs text-gray-500">{user.timezone}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meeting Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Meeting Duration:</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Find Availability Button */}
          <Button
            onClick={findMutualAvailability}
            disabled={selectedUsers.length < 2 || loading}
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Finding Availability...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Find Mutual Availability
              </div>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Results */}
      {availabilitySlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availabilitySlots.slice(0, 10).map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="font-medium text-gray-900">
                        {formatDate(slot.start)} • {formatTime(slot.start)} - {formatTime(slot.end)}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getConfidenceColor(slot.confidence)
                      }`}>
                        {getConfidenceText(slot.confidence)} Confidence
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{slot.reason}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>✓ {slot.availableUsers.length} available</span>
                      {slot.conflictingUsers.length > 0 && (
                        <span>⚠ {slot.conflictingUsers.length} conflicts</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onScheduleMeeting?.(slot, selectedUsers)}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Schedule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!loading && selectedUsers.length >= 2 && availabilitySlots.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mutual Availability Found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting the meeting duration or time preferences to find available slots.
            </p>
            <Button variant="outline" onClick={findMutualAvailability}>
              Try Different Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}