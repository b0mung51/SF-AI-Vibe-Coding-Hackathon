import Navigation from "../components/Navigation";

export default function MeetingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Meeting Suggestions</h1>
        
        {/* Time Slot Suggestions Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Time Slots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer">
              <div className="text-sm text-gray-500 mb-1">Today</div>
              <div className="font-medium text-gray-900">2:00 PM - 3:00 PM</div>
              <div className="text-sm text-green-600 mt-1">✓ Both available</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer">
              <div className="text-sm text-gray-500 mb-1">Tomorrow</div>
              <div className="font-medium text-gray-900">10:00 AM - 11:00 AM</div>
              <div className="text-sm text-green-600 mt-1">✓ Both available</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer">
              <div className="text-sm text-gray-500 mb-1">Tomorrow</div>
              <div className="font-medium text-gray-900">3:00 PM - 4:00 PM</div>
              <div className="text-sm text-green-600 mt-1">✓ Both available</div>
            </div>
          </div>
        </div>

        {/* Meeting Scheduler Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Meeting</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                placeholder="Enter meeting title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Description
              </label>
              <textarea
                placeholder="Enter meeting description..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
