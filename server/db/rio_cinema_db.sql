
CREATE TABLE cities (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE theaters (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    name    VARCHAR(150) NOT NULL,
    lat     DOUBLE PRECISION,
    lng     DOUBLE PRECISION
);

CREATE TABLE advertisements (
    id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    image_url TEXT NOT NULL,
    placement VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE users (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,          
    name              VARCHAR(100) NOT NULL,
    role              VARCHAR(20) NOT NULL DEFAULT 'customer',
    paid_ticket_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE rooms (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    theater_id INTEGER NOT NULL REFERENCES theaters (id),
    name       VARCHAR(100) NOT NULL,
    capacity   INTEGER NOT NULL CHECK (capacity > 0)
);

CREATE TABLE seats (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id        INTEGER NOT NULL REFERENCES rooms (id),
    row_no         INTEGER NOT NULL,
    row_label      VARCHAR(5) NOT NULL,
    seat_label     VARCHAR(10) NOT NULL,
    is_owner_seat  BOOLEAN NOT NULL DEFAULT FALSE,
    is_wheelchair  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (room_id, row_label, seat_label)
);

CREATE TABLE movies (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    poster_url  TEXT,
    trailer_url TEXT,
    age_rating  VARCHAR(10),
    runtime_min INTEGER CHECK (runtime_min > 0)
);

CREATE TABLE shows (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    movie_id   INTEGER NOT NULL REFERENCES movies (id),
    room_id    INTEGER NOT NULL REFERENCES rooms (id),
    start_at   TIMESTAMP NOT NULL,
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    status     VARCHAR(20) NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE bookings (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    show_id             INTEGER NOT NULL REFERENCES shows (id),
    user_id             INTEGER REFERENCES users (id), 
    guest_email         VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'held',
    hold_expires_at     TIMESTAMP,
    pay_by              TIMESTAMP,
    total_price         NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_by_staff_id INTEGER REFERENCES users (id),

	
    CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE TABLE tickets (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id    INTEGER NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    show_id       INTEGER NOT NULL REFERENCES shows (id),
    seat_id       INTEGER NOT NULL REFERENCES seats (id),
    ticket_type   VARCHAR(30) NOT NULL,
    discount_type VARCHAR(30),
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    UNIQUE (show_id, seat_id)  
);

CREATE TABLE payments (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id   INTEGER NOT NULL REFERENCES bookings (id),
    amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    provider_ref VARCHAR(100),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    paid_at      TIMESTAMP
);

CREATE TABLE feedback (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    show_id INTEGER NOT NULL REFERENCES shows (id),
    rating  INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT
);

CREATE TABLE waitlist_entries (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    show_id      INTEGER NOT NULL REFERENCES shows (id),
    user_id      INTEGER REFERENCES users (id),
    email        VARCHAR(255),
    seats_wanted INTEGER NOT NULL DEFAULT 1 CHECK (seats_wanted > 0),
    status       VARCHAR(20) NOT NULL DEFAULT 'waiting',
    notified_at  TIMESTAMP
);

CREATE TABLE seat_changes (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id    INTEGER NOT NULL REFERENCES tickets (id),
    from_seat_id INTEGER NOT NULL REFERENCES seats (id),
    to_seat_id   INTEGER NOT NULL REFERENCES seats (id),
    changed_by   INTEGER REFERENCES users (id),
    changed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_theaters_city_id  ON theaters (city_id);
CREATE INDEX idx_rooms_theater_id  ON rooms (theater_id);
CREATE INDEX idx_shows_movie_id    ON shows (movie_id);
CREATE INDEX idx_shows_start_at    ON shows (start_at);
CREATE INDEX idx_bookings_show_id  ON bookings (show_id);
CREATE INDEX idx_bookings_user_id  ON bookings (user_id);
CREATE INDEX idx_tickets_booking_id ON tickets (booking_id);
CREATE INDEX idx_payments_booking_id ON payments (booking_id);


GRANT USAGE ON SCHEMA public TO rio_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rio_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rio_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO rio_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rio_admin;


---- Insert queries
-- 1. Cities
INSERT INTO cities (name)
SELECT v.name FROM (VALUES ('Oulu'), ('Tampere')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.name = v.name);

-- 2. Theaters (one per city)
INSERT INTO theaters (city_id, name, lat, lng)
SELECT c.id, v.name, v.lat, v.lng
FROM (VALUES ('Oulu',    'Rio Cinema Oulu',    65.0121, 25.4651),
             ('Tampere', 'Rio Cinema Tampere', 61.4978, 23.7610)) AS v(city, name, lat, lng)
JOIN cities c ON c.name = v.city
WHERE NOT EXISTS (SELECT 1 FROM theaters t WHERE t.city_id = c.id);

-- 3. Rooms: 100 seats and 200 seats in each theater (4 rooms in total)
INSERT INTO rooms (theater_id, name, capacity)
SELECT t.id, v.name, v.capacity
FROM theaters t
CROSS JOIN (VALUES ('Room 1', 100), ('Room 2', 200)) AS v(name, capacity)
WHERE t.name IN ('Rio Cinema Oulu', 'Rio Cinema Tampere')
  AND NOT EXISTS (SELECT 1 FROM rooms x WHERE x.theater_id = t.id);

-- 4. Seats: snake order, no seat/row 13, seat 1 = owner, wheelchair places in row 1
INSERT INTO seats (room_id, row_no, row_label, seat_label, is_owner_seat, is_wheelchair)
SELECT r.id,
       i / 10 + 1,
       (CASE WHEN i / 10 + 1 >= 13 THEN i / 10 + 2 ELSE i / 10 + 1 END)::text,
       (CASE WHEN i + 1 >= 13 THEN i + 2 ELSE i + 1 END)::text,
       (i = 0),
       (i / 10 = 0 AND i BETWEEN 1 AND (CASE WHEN r.capacity = 100 THEN 2 ELSE 3 END))
FROM rooms r
CROSS JOIN LATERAL generate_series(0, r.capacity - 1) AS i
WHERE NOT EXISTS (SELECT 1 FROM seats s WHERE s.room_id = r.id);

-- 5. Movies
INSERT INTO movies (title, poster_url, trailer_url, age_rating, runtime_min)
SELECT v.title, v.poster, '', v.age, v.mins
FROM (VALUES
  ('Angry Bird',  'https://a3s.fi/swift/v1/rio_cinema/angry_bird.jpg', 'K12', 118),
  ('Dooms Days',  'https://a3s.fi/swift/v1/rio_cinema/doomsday.jpg',   'K7',  104),
  ('Red Curtain', 'https://a3s.fi/swift/v1/rio_cinema/gollum.jpg',     'K16', 131)
) AS v(title, poster, age, mins)
WHERE NOT EXISTS (SELECT 1 FROM movies m WHERE m.title = v.title);

-- 6. Shows: today + next 2 days, 16:30 and 19:30, every demo movie in every room
INSERT INTO shows (movie_id, room_id, start_at, base_price)
SELECT m.id, r.id, current_date + d * interval '1 day' + x.t::time,
       CASE WHEN r.capacity = 200 THEN 13.50 ELSE 12.00 END
FROM movies m
CROSS JOIN rooms r
CROSS JOIN generate_series(0, 2) AS d
CROSS JOIN (VALUES ('16:30'), ('19:30')) AS x(t)
WHERE m.title IN ('Angry Bird', 'Dooms Days', 'Red Curtain')
  AND NOT EXISTS (SELECT 1 FROM shows s
                  WHERE s.room_id = r.id AND s.movie_id = m.id
                    AND s.start_at = current_date + d * interval '1 day' + x.t::time);