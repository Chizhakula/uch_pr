CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login VARCHAR(80) NOT NULL UNIQUE CHECK (login ~ '^[A-Za-z0-9]{6,}$'),
  password_hash TEXT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(16) NOT NULL CHECK (phone ~ '^8\([0-9]{3}\)[0-9]{3}-[0-9]{2}-[0-9]{2}$'),
  email VARCHAR(254) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('auditorium','coworking','cinema')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  starts_at TIMESTAMP NOT NULL,
  payment_method VARCHAR(15) NOT NULL CHECK (payment_method IN ('in_person','sbp')),
  status VARCHAR(15) NOT NULL DEFAULT 'new' CHECK (status IN ('new','scheduled','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_starts_at_idx ON bookings(starts_at);
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
INSERT INTO rooms (name,room_type,capacity,description) VALUES
 ('Аудитория 1001','auditorium',60,'Проектор и микрофоны'),
 ('Аудитория 2002','auditorium',200,'Большая аудитория'),
 ('Коворкинг Центральный','coworking',50,'Столы и рабочие места'),
 ('Коворкинг "ЛУЧ"','coworking',20,'Помещение для небольших встреч'),
 ('Кинозал "Сапфир"','cinema',210,'Экран и звуковая система'),
 ('Кинозал "Уссури"','cinema',120,'Зал для докладов и показов')
ON CONFLICT(name) DO NOTHING;
