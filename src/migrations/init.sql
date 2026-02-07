-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(100) UNIQUE NOT NULL,
  phone varchar(30) UNIQUE,
  email varchar(255) UNIQUE,
  password_hash varchar(255),
  role varchar(20) NOT NULL DEFAULT 'USER',
  trust_score numeric DEFAULT 0,
  reports_count integer DEFAULT 0,
  device_tokens text[],
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Reports table (minimal)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  report_type varchar(50),
  severity varchar(20),
  title varchar(200),
  description text,
  location geography(Point,4326),
  county varchar(100),
  status varchar(50) DEFAULT 'PENDING_VERIFICATION',
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  has_media boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Public Facilities table
CREATE TABLE IF NOT EXISTS public_facilities (
  facility_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  facility_type varchar(50) NOT NULL,
  address text,
  county varchar(100),
  phone varchar(30),
  email varchar(255),
  location geography(Point,4326),
  is_active boolean DEFAULT true,
  rating numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(report_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  comment_text text,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  type varchar(50),
  title varchar(255),
  message text,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS reports_location_idx ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS facilities_location_idx ON public_facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_county_idx ON reports(county);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS comments_report_idx ON comments(report_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);
