'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserByUsername } from '@/app/lib/db';
import { useAuth } from '@/app/contexts/AuthContext';
import type { User, SuggestionChip } from '@/app/types';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  slots?: Array<{
    start: string;
    end: string;
    label?: string;
  }>;
}

const SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: '1', label: 'First 30m', intent: 'first30m', duration: 30 },
  { id: '2', label: 'First 1h', intent: 'first1h', duration: 60 },
  { id: '3', label: 'Morning coffee', intent: 'coffee', duration: 60, bufferBefore: 30, bufferAfter: 30, timeWindow: { start: '07:30', end: '10:30' } },
  { id: '4', label: 'Lunch', intent: 'lunch', duration: 60, bufferBefore: 30, bufferAfter: 30, timeWindow: { start: '11:00', end: '14:00' } },
  { id: '5', label: 'Dinner', intent: 'dinner', duration: 60, bufferBefore: 30, bufferAfter: 30, timeWindow: { start: '17:30', end: '20:30' } },
];

const SUGGESTED_PROMPTS = [
  'Next week afternoons',
  'Avoid Tue/Thu',
  'Between 11:30-1:30 near SOMA',
  'Earliest 60-min after 2pm',
];

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Suggestion chips state
  const [selectedChip, setSelectedChip] = useState<SuggestionChip | null>(null);
  const [scheduling, setScheduling] = useState(false);

  // Chat interface state
  const [showCustomChat, setShowCustomChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTargetUser();
  }, [params.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTargetUser = async () => {
    try {
      const username = params.username as string;
      const user = await getUserByUsername(username);

      if (!user) {
        router.push('/');
        return;
      }

      setTargetUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = async (chip: SuggestionChip) => {
    if (!currentUser || !targetUser) return;

    setSelectedChip(chip);
    setScheduling(true);

    try {
      const response = await fetch('/api/availability/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Id: currentUser.id,
          user2Id: targetUser.id,
          intent: chip.intent,
          duration: chip.duration,
          bufferBefore: chip.bufferBefore,
          bufferAfter: chip.bufferAfter,
          timeWindow: chip.timeWindow,
        }),
      });

      const data = await response.json();

      if (data.slot) {
        openCalendarCompose(data.slot, chip, targetUser);
      } else {
        alert('No available time slots found in the next 14 days');
      }
    } catch (error) {
      console.error('Error getting suggestion:', error);
      alert('Failed to find available time');
    } finally {
      setScheduling(false);
      setSelectedChip(null);
    }
  };

  const openCalendarCompose = (slot: any, chip: SuggestionChip, otherUser: User) => {
    const eventName = getEventName(chip.intent, otherUser.displayName);
    const eventDescription = getEventDescription(chip.intent, otherUser.displayName);

    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);

    const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalUrl.searchParams.set('action', 'TEMPLATE');
    googleCalUrl.searchParams.set('text', eventName);
    googleCalUrl.searchParams.set('details', eventDescription);
    googleCalUrl.searchParams.set('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
    googleCalUrl.searchParams.set('add', otherUser.email);

    if (slot.location) {
      googleCalUrl.searchParams.set('location', slot.location);
    }

    window.open(googleCalUrl.toString(), '_blank');
  };

  const handleCustomChatToggle = () => {
    setShowCustomChat(!showCustomChat);
    if (!showCustomChat && messages.length === 0) {
      // Initialize chat with AI greeting
      setMessages([{
        id: '1',
        type: 'ai',
        content: `I'll help you find the perfect time to meet with ${targetUser?.displayName}. What kind of time works best for you?`,
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !currentUser || !targetUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/availability/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Id: currentUser.id,
          user2Id: targetUser.id,
          prompt: input,
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.message || 'I found some available times for you:',
        slots: data.slots,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing request:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I had trouble finding available times. Please try again.',
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptChip = (prompt: string) => {
    setInput(prompt);
  };

  const handleScheduleSlot = (slot: { start: string; end: string }) => {
    if (!targetUser) return;

    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);

    const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalUrl.searchParams.set('action', 'TEMPLATE');
    googleCalUrl.searchParams.set('text', `Meeting with ${targetUser.displayName}`);
    googleCalUrl.searchParams.set('details', `Scheduled via Cal Connect`);
    googleCalUrl.searchParams.set('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
    googleCalUrl.searchParams.set('add', targetUser.email);

    window.open(googleCalUrl.toString(), '_blank');
  };

  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const formatSlotTime = (slot: { start: string; end: string }) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

    return `${start.toLocaleDateString('en-US', dateOptions)} ${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
  };

  const getEventName = (intent: string, otherPersonName: string): string => {
    switch (intent) {
      case 'coffee':
        return `Coffee with ${otherPersonName}`;
      case 'lunch':
        return `Lunch with ${otherPersonName}`;
      case 'dinner':
        return `Dinner with ${otherPersonName}`;
      default:
        return `Meeting with ${otherPersonName}`;
    }
  };

  const getEventDescription = (intent: string, otherPersonName: string): string => {
    switch (intent) {
      case 'coffee':
        return `Coffee meeting with ${otherPersonName}. Travel buffers assumed ±30m.`;
      case 'lunch':
        return `Lunch meeting with ${otherPersonName}. Duration 50m. Travel buffers assumed ±30m.`;
      case 'dinner':
        return `Dinner with ${otherPersonName}. Travel buffers assumed ±30m.`;
      case 'first30m':
        return `30-minute conversation with ${otherPersonName}.`;
      case 'first1h':
        return `60-minute conversation with ${otherPersonName}.`;
      default:
        return `Meeting with ${otherPersonName}.`;
    }
  };

  if (loading || !targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (showCustomChat) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={handleCustomChatToggle}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">Find a custom time</h1>
              <p className="text-sm text-gray-500">with {targetUser.displayName}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-md mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className={message.type === 'user' ? 'text-white' : 'text-gray-900'}>
                    {message.content}
                  </p>

                  {message.slots && message.slots.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.slots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleScheduleSlot(slot)}
                          className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                        >
                          <p className="font-medium text-gray-900">
                            {slot.label || formatSlotTime(slot)}
                          </p>
                          <p className="text-sm text-blue-600 mt-1">Schedule →</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <div className="max-w-md mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptChip(prompt)}
                    className="flex-shrink-0 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Describe when you'd like to meet..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Target User Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-3">
          {targetUser.photoURL ? (
            <img
              src={targetUser.photoURL}
              alt={targetUser.displayName}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {targetUser.displayName?.[0] || 'U'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{targetUser.displayName}</p>
            <p className="text-sm text-gray-500">@{targetUser.username}</p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pick a suggested time</h2>

          <div className="space-y-3">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip)}
                disabled={scheduling}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedChip?.id === chip.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{chip.label}</span>
                  {selectedChip?.id === chip.id && scheduling && (
                    <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </div>
                {chip.timeWindow && (
                  <span className="text-sm text-gray-500 mt-1">
                    {chip.timeWindow.start} - {chip.timeWindow.end}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Time Button */}
        <button
          onClick={handleCustomChatToggle}
          className="w-full py-3 px-4 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
        >
          Find custom time
        </button>
      </div>
    </div>
  );
}