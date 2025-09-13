'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Globe, ArrowRight, ArrowLeft, Check, Link, Loader2, Zap } from 'lucide-react';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui';
import { useOnboardingStore } from '@/src/store';
import { cn } from '@/src/lib/utils';

const steps = [
  {
    id: 1,
    title: 'Welcome to CalConnect',
    description: 'Let\'s set up your scheduling preferences',
    icon: Calendar,
  },
  {
    id: 2,
    title: 'Connect Cal.com',
    description: 'Connect your calendar for automatic setup',
    icon: Link,
  },
  {
    id: 3,
    title: 'Timezone & Location',
    description: 'Set your timezone and location preferences',
    icon: Globe,
  },
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return {
    value: `${hour}:00`,
    label: `${hour}:00`,
  };
});

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    currentStep,
    workingHours,
    lunchWindow,
    timezone,
    setCurrentStep,
    setWorkingHours,
    setLunchWindow,
    setTimezone,
    setIsCompleted,
  } = useOnboardingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [calcomConnecting, setCalcomConnecting] = useState(false);
  const [calcomConnected, setCalcomConnected] = useState(false);
  const [detectedHours, setDetectedHours] = useState<any>(null);
  const [location, setLocation] = useState('');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalcomConnect = async () => {
    setCalcomConnecting(true);
    try {
      // Connect to Cal.com and detect working hours
      const response = await fetch('/api/calcom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'connect_account',
          calcomUserId: 123 // This would come from Cal.com OAuth
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCalcomConnected(true);
        setDetectedHours(result.data.workingHours);
        
        // Auto-populate working hours from detection
        if (result.data.workingHours) {
          setWorkingHours(result.data.workingHours.workingHours);
          setLunchWindow(result.data.workingHours.lunchWindow);
        }
        
        // Auto-advance to next step after successful connection
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1500);
      }
    } catch (error) {
      console.error('Error connecting to Cal.com:', error);
    } finally {
      setCalcomConnecting(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save the onboarding data including detected working hours
      const onboardingData = {
        timezone,
        location,
        workingHours,
        lunchWindow,
        calcomConnected,
        detectedHours
      };
      
      // Here you would save to your backend
      console.log('Saving onboarding data:', onboardingData);
      
      setIsCompleted(true);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkingHours = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day as keyof typeof workingHours],
        [field]: value,
      },
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {session.user?.name}!
              </h2>
              <p className="text-gray-600">
                Let&apos;s set up your CalConnect profile to start scheduling meetings efficiently.
                This will only take a few minutes.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What we'll set up automatically:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Connect your Cal.com account</li>
                <li>• Auto-detect your working hours from calendar history</li>
                <li>• Configure timezone and location preferences</li>
                <li>• Set up smart availability patterns</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Cal.com</h2>
              <p className="text-gray-600">
                Connect your Cal.com account to automatically detect your working hours and availability patterns.
              </p>
            </div>
            
            {!calcomConnected ? (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-blue-900 mb-2">Smart Setup with Cal.com</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    We'll analyze your calendar history to automatically detect:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 mb-6">
                    <li>• Your typical working hours</li>
                    <li>• Lunch break patterns</li>
                    <li>• Meeting preferences</li>
                    <li>• Availability patterns</li>
                  </ul>
                  <Button
                    onClick={handleCalcomConnect}
                    disabled={calcomConnecting}
                    className="w-full"
                  >
                    {calcomConnecting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Connecting & Analyzing...
                      </>
                    ) : (
                      <>
                        <Link className="h-5 w-5 mr-2" />
                        Connect Cal.com Account
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Don't have a Cal.com account?{' '}
                    <a href="https://cal.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Sign up for free
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-green-900 mb-2">Successfully Connected!</h3>
                  <p className="text-sm text-green-800 mb-4">
                    We've analyzed your calendar and detected your working patterns.
                  </p>
                  
                  {detectedHours && (
                    <div className="bg-white rounded-lg p-4 mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Detected Working Hours</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Confidence: {Math.round(detectedHours.confidence * 100)}%
                      </p>
                      <div className="text-xs text-gray-500">
                        {Object.entries(detectedHours.workingHours || {})
                          .filter(([_, hours]: [string, any]) => hours.enabled)
                          .map(([day, hours]: [string, any]) => (
                            <div key={day} className="flex justify-between">
                              <span className="capitalize">{day}:</span>
                              <span>{hours.start} - {hours.end}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
               </div>
             )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Timezone & Preferences</h2>
              <p className="text-gray-600">
                Configure your timezone and lunch break preferences.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Timezone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your city or location"
                />
              </div>
              
              {/* Lunch Window */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={lunchWindow.enabled}
                    onChange={(e) => setLunchWindow({ ...lunchWindow, enabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="font-medium text-gray-900">
                    Enable lunch break
                  </label>
                </div>
                
                {lunchWindow.enabled && (
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Start time</label>
                      <Select
                        value={lunchWindow.start}
                        onValueChange={(value) => setLunchWindow({ ...lunchWindow, start: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">End time</label>
                      <Select
                        value={lunchWindow.end}
                        onValueChange={(value) => setLunchWindow({ ...lunchWindow, end: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isCompleted
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  )}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={cn(
                      'w-16 h-0.5 mx-4',
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1]?.title}
            </h1>
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            loading={isLoading}
            rightIcon={currentStep === steps.length ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          >
            {currentStep === steps.length ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}