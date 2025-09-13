-- Multi-User Calendar Scheduling Database Schema
-- This schema supports storing calendar data for multiple users and finding mutual availability

-- Users table (extends NextAuth user data)
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE,
  google_id VARCHAR(255),
  avatar TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Calendar sources (connections to external calendars)
CREATE TABLE calendar_sources (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  cal_user_id VARCHAR(255), -- Cal.com user ID
  provider_category ENUM('work', 'personal') NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_sources (user_id),
  INDEX idx_last_sync (last_sync)
);

-- User availability preferences
CREATE TABLE availability_preferences (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  buffer_time INT DEFAULT 15, -- minutes between meetings
  
  -- Working hours (JSON format)
  working_hours JSON NOT NULL,
  
  -- Lunch window
  lunch_start TIME,
  lunch_end TIME,
  lunch_enabled BOOLEAN DEFAULT TRUE,
  
  -- Blackout dates
  blackout_dates JSON, -- Array of dates
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_prefs (user_id)
);

-- Calendar events (synced from external sources)
CREATE TABLE calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(500),
  attendees JSON, -- Array of email addresses
  event_type ENUM('meeting', 'focus', 'break', 'other') DEFAULT 'meeting',
  source ENUM('google', 'outlook', 'calcom') NOT NULL,
  external_id VARCHAR(255), -- ID from external calendar
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_events (user_id),
  INDEX idx_time_range (start_time, end_time),
  INDEX idx_external_source (source, external_id)
);

-- Availability requests (for multi-user scheduling)
CREATE TABLE availability_requests (
  id VARCHAR(255) PRIMARY KEY,
  requester_id VARCHAR(255) NOT NULL,
  user_ids JSON NOT NULL, -- Array of user IDs
  duration INT NOT NULL, -- minutes
  preferred_start_time TIME DEFAULT '09:00:00',
  preferred_end_time TIME DEFAULT '17:00:00',
  exclude_days JSON, -- Array of day numbers (0-6)
  look_ahead_days INT DEFAULT 14,
  require_all_users BOOLEAN DEFAULT TRUE,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_requester (requester_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- Availability slots (results from availability requests)
CREATE TABLE availability_slots (
  id VARCHAR(255) PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  available_user_ids JSON NOT NULL, -- Array of user IDs
  conflicting_user_ids JSON, -- Array of user IDs with conflicts
  reason VARCHAR(500),
  slot_type ENUM('meeting', 'focus', 'flexible') DEFAULT 'meeting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES availability_requests(id) ON DELETE CASCADE,
  INDEX idx_request_slots (request_id),
  INDEX idx_time_confidence (start_time, confidence),
  INDEX idx_slot_type (slot_type)
);

-- Multi-user meetings
CREATE TABLE multi_user_meetings (
  id VARCHAR(255) PRIMARY KEY,
  organizer_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INT NOT NULL, -- minutes
  location VARCHAR(500),
  meeting_url TEXT,
  status ENUM('draft', 'scheduled', 'cancelled', 'completed') DEFAULT 'draft',
  availability_slot_id VARCHAR(255), -- Links to the chosen slot
  calcom_event_id VARCHAR(255), -- Cal.com booking ID
  google_calendar_event_id VARCHAR(255), -- Google Calendar event ID for sync
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (availability_slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL,
  INDEX idx_organizer (organizer_id),
  INDEX idx_time_range (start_time, end_time),
  INDEX idx_status (status)
);

-- Meeting participants
CREATE TABLE meeting_participants (
  id VARCHAR(255) PRIMARY KEY,
  meeting_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('invited', 'accepted', 'declined', 'tentative') DEFAULT 'invited',
  response_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES multi_user_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_meeting_participant (meeting_id, user_id),
  INDEX idx_meeting_participants (meeting_id),
  INDEX idx_user_meetings (user_id),
  INDEX idx_participant_status (status)
);

-- Cached availability (for performance optimization)
CREATE TABLE cached_availability (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  date_range VARCHAR(50) NOT NULL, -- e.g., '2024-01-01_2024-01-31'
  slots JSON NOT NULL, -- Array of time slots
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_date_range (user_id, date_range),
  INDEX idx_user_cache (user_id),
  INDEX idx_expires (expires_at)
);

-- Sync status tracking
CREATE TABLE sync_status (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  source ENUM('google', 'outlook', 'calcom') NOT NULL,
  last_sync TIMESTAMP,
  next_sync TIMESTAMP,
  sync_interval_minutes INT DEFAULT 15,
  error_count INT DEFAULT 0,
  last_error TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_source (user_id, source),
  INDEX idx_next_sync (next_sync),
  INDEX idx_active_syncs (is_active)
);

-- Indexes for performance optimization
CREATE INDEX idx_events_time_user ON calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_meetings_time_status ON multi_user_meetings(start_time, status);
CREATE INDEX idx_slots_confidence_time ON availability_slots(confidence DESC, start_time);

-- Views for common queries
CREATE VIEW user_upcoming_events AS
SELECT 
  ce.*,
  u.name as user_name,
  u.email as user_email
FROM calendar_events ce
JOIN users u ON ce.user_id = u.id
WHERE ce.start_time > NOW()
ORDER BY ce.start_time;

CREATE VIEW active_multi_user_meetings AS
SELECT 
  mum.*,
  u.name as organizer_name,
  u.email as organizer_email,
  COUNT(mp.id) as participant_count,
  SUM(CASE WHEN mp.status = 'accepted' THEN 1 ELSE 0 END) as accepted_count
FROM multi_user_meetings mum
JOIN users u ON mum.organizer_id = u.id
LEFT JOIN meeting_participants mp ON mum.id = mp.meeting_id
WHERE mum.status IN ('draft', 'scheduled')
GROUP BY mum.id;

-- Triggers for automatic updates
DELIMITER //

CREATE TRIGGER update_availability_preferences_timestamp
  BEFORE UPDATE ON availability_preferences
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_calendar_events_timestamp
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_multi_user_meetings_timestamp
  BEFORE UPDATE ON multi_user_meetings
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_meeting_participants_timestamp
  BEFORE UPDATE ON meeting_participants
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Sample data for testing (optional)
-- INSERT INTO users (id, email, name, username, timezone) VALUES
-- ('user1', 'alice@example.com', 'Alice Johnson', 'alice', 'America/Los_Angeles'),
-- ('user2', 'bob@example.com', 'Bob Smith', 'bob', 'America/New_York'),
-- ('user3', 'carol@example.com', 'Carol Davis', 'carol', 'Europe/London');

-- Comments for documentation
-- This schema supports:
-- 1. Multi-user calendar synchronization from various sources
-- 2. Intelligent availability detection and caching
-- 3. Multi-user meeting scheduling with participant management
-- 4. Conflict detection and resolution
-- 5. Performance optimization through indexing and caching
-- 6. Audit trails and sync status tracking