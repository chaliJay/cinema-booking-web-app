
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
