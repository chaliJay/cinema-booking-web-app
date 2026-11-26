
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// const API_URL = "https://cinema-booking-web-app-server-rio-cinema-web-app.2.rahtiapp.fi";
const API_URL ="http://localhost:5000";

// Stripe setup
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from .env");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// PostgreSQL setup
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Allowed frontend addresse
const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "https://cinema-booking-web-app-client-rio-cinema-web-app.2.rahtiapp.fi"
];


// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Test server
app.get("/", (req, res) => {
    res.send("Rio Cinema Payment Server is running!");
});


const CINEMA_TZ = process.env.CINEMA_TZ || "Europe/Helsinki";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Get cities from PostgreSQL
app.get("/api/cities", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM cities ORDER BY id"
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get movies from PostgreSQL
app.get("/api/movies", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM movies ORDER BY id"
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get movies from PostgreSQL
app.get("/api/movies/:id", async (req, res) => {
    try {
        const movieId = req.params.id;

        const result = await pool.query(
            "SELECT * FROM movies WHERE id = $1", [movieId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});


// Create Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
    try {
        const { movieId, quantity } = req.body;

        const response = await fetch(
            `${API_URL}/api/movies/${movieId}`
        );

        if (!response.ok) {
            return res.status(400).json({
                error: "Invalid movie selected"
            });
        }

        const movie = await response.json();


        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 10
        ) {
            return res.status(400).json({
                error: "Please select between 1 and 10 tickets"
            });
        }

        const origin = req.headers.origin;

        if (!allowedOrigins.includes(origin)) {
            return res.status(403).json({
                error: "Invalid website origin"
            });
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: "eur",
                        product_data: {
                            name: movie.name + " - Cinema Ticket"
                        },
                        unit_amount: 1200 // todo : need to get real price
                    },
                    quantity: quantity
                }
            ],
            mode: "payment",
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${origin}/cancel`,    
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Stripe error:", error.message);
        res.status(500).json({
            error: "Unable to create payment session"
        });
    }
});


// Verify Stripe payment
app.get("/api/verify-session", async (req, res) => {
    try {
        const sessionId = req.query.session_id;

        if (
            typeof sessionId !== "string" ||
            !sessionId.startsWith("cs_test_")
        ) {
            return res.status(400).json({
                error: "Invalid session ID"
            });
        }

        const session =
            await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return res.status(400).json({
                paid: false,
                error: "Payment has not been completed"
            });
        }

        res.json({
            paid: true,
            amount: session.amount_total,
            currency: session.currency
        });

    } catch (error) {
        console.error("Verification error:", error.message);
        res.status(500).json({
            error: "Unable to verify payment"
        });
    }
});

// =====================================
// AUTHENTICATION SYSTEM
// =====================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Signup
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "All fields are required."
            });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({
                error: "Name must be less than 100 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: "Enter a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Save user
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role`,
            [name.trim(), normalizedEmail, passwordHash]
        );

        const user = result.rows[0];

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Account created successfully!",
            token,
            user
        });

    } catch (error) {
        console.error("Signup error:", error);

        res.status(500).json({
            error: "Unable to create account."
        });
    }
});


// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            error: "Unable to login."
        });
    }
});


// Verify logged-in user
app.get("/api/auth/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Not authenticated."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "User not found."
            });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        res.status(401).json({
            error: "Invalid or expired token."
        });
    }
});

// theaters + upcoming shows for one movie
app.get("/api/movies/:movieId/shows", async (req, res) => {
  try {
    const { rows } = await pool.query(
        `SELECT sh.id        AS show_id,
                sh.base_price,
                to_char(sh.start_at, 'HH24:MI')   AS time,
                to_char(sh.start_at, 'Dy DD Mon') AS day,
                th.id   AS theater_id,
                th.name AS theater_name
            FROM shows sh
            JOIN rooms r     ON r.id  = sh.room_id
            JOIN theaters th ON th.id = r.theater_id
            WHERE sh.movie_id = $1
            AND sh.status = 'scheduled'
            AND sh.start_at > now()
            AND r.capacity = 100          -- remove this line when the 200 hall is ready
            ORDER BY th.name, sh.start_at`,
        [req.params.movieId]
    );

    // group the rows by theater
    const theaters = [];
    for (const row of rows) {
      let t = theaters.find((x) => x.id === row.theater_id);
      if (!t) {
        t = { id: row.theater_id, name: row.theater_name, shows: [] };
        theaters.push(t);
      }
      t.shows.push({
        id: row.show_id,
        day: row.day,
        time: row.time,
        price: Number(row.base_price),
      });
    }

    res.json(theaters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load shows" });
  }
});

// seats only an admin can book
app.get("/api/shows/:showId/restricted-seats", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.row_label, s.seat_label
         FROM shows sh
         JOIN seats s ON s.room_id = sh.room_id
        WHERE sh.id = $1 AND s.is_owner_seat = true`,
      [req.params.showId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- helper: logged-in user (or null) ----------
async function getUserFromRequest(req) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) return null;

        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
        const result = await pool.query(
            "SELECT id, email, role FROM users WHERE id = $1",
            [decoded.id]
        );
        return result.rows[0] || null;
    } catch {
        return null; // no token or invalid token = guest
    }
}

// Booked seats of one show -> [{ row_label, seat_label }]
app.get("/api/shows/:showId/booked-seats", async (req, res) => {
    try {
        const showId = Number(req.params.showId);
        if (!Number.isInteger(showId)) {
            return res.status(400).json({ error: "Invalid show id" });
        }

        const { rows } = await pool.query(
            `SELECT s.row_label, s.seat_label
             FROM tickets t
             JOIN seats s    ON s.id = t.seat_id
             JOIN bookings b ON b.id = t.booking_id
             WHERE t.show_id = $1 AND b.status <> 'cancelled'`,
            [showId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Booked seats error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Save a booking: body { showId, seats: [{ row, number }], email? }
app.post("/api/bookings", async (req, res) => {
    const { showId, seats, email } = req.body || {};

    if (!Number.isInteger(showId)) {
        return res.status(400).json({ error: "Invalid show id" });
    }
    if (!Array.isArray(seats) || seats.length < 1 || seats.length > 6) {
        return res.status(400).json({ error: "Select 1 to 6 seats" });
    }
    if (!seats.every((s) => s && s.row !== undefined && s.number !== undefined)) {
        return res.status(400).json({ error: "Invalid seat data" });
    }

    const keys = seats.map((s) => `${s.row}-${s.number}`);
    if (new Set(keys).size !== keys.length) {
        return res.status(400).json({ error: "Duplicate seats" });
    }

    const user = await getUserFromRequest(req);
    const isAdmin = user?.role === "admin";

    // booking needs a user or an email (CHECK in the bookings table)
    const guestEmail =
        typeof email === "string" && EMAIL_RE.test(email)
            ? email.trim().toLowerCase()
            : "guest@example.com"; // temporary until the frontend sends an email

    const db = await pool.connect();
    try {
        // the show must exist, be scheduled and not started yet
        const showResult = await db.query(
            `SELECT room_id, base_price
             FROM shows
             WHERE id = $1 AND status = 'scheduled'
               AND start_at > (now() AT TIME ZONE $2)`,
            [showId, CINEMA_TZ]
        );
        if (showResult.rows.length === 0) {
            return res.status(404).json({ error: "Show not found or already started" });
        }
        const { room_id, base_price } = showResult.rows[0];

        // find each seat in this room
        const seatIds = [];
        for (const s of seats) {
            const found = await db.query(
                `SELECT id, is_owner_seat
                 FROM seats
                 WHERE room_id = $1 AND row_label = $2 AND seat_label = $3`,
                [room_id, String(s.row), String(s.number)]
            );
            if (found.rowCount === 0) {
                return res.status(400).json({ error: "Seat does not exist in this room" });
            }
            if (found.rows[0].is_owner_seat && !isAdmin) {
                return res.status(403).json({ error: "This seat can only be booked by an admin" });
            }
            seatIds.push(found.rows[0].id);
        }

        const total = Number(base_price) * seatIds.length;

        // booking + tickets together; UNIQUE (show_id, seat_id) stops double booking
        await db.query("BEGIN");
        try {
            const booking = await db.query(
                `INSERT INTO bookings (show_id, user_id, guest_email, status, total_price)
                 VALUES ($1, $2, $3, 'confirmed', $4) RETURNING id`,
                [showId, user ? user.id : null, user ? null : guestEmail, total.toFixed(2)]
            );
            const bookingId = booking.rows[0].id;

            await db.query(
                `INSERT INTO tickets (booking_id, show_id, seat_id, ticket_type, price)
                 SELECT $1, $2, unnest($3::int[]), 'adult', $4`,
                [bookingId, showId, seatIds, base_price]
            );

            await db.query("COMMIT");
            res.status(201).json({ ok: true, bookingId, total });
        } catch (err) {
            await db.query("ROLLBACK");
            if (err.code === "23505") {
                return res.status(409).json({ error: "Someone just took one of these seats. Pick again." });
            }
            throw err;
        }
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ error: "Unable to book seats" });
    } finally {
        db.release();
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Rio Cinema server running on port ${PORT}`);
});


