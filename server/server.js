
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    "http://localhost:5173"
];

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Movie catalogue (prices in EUR cents)
const movies = {
    avatar: { name: "Avatar", price: 1200 },
    interstellar: { name: "Interstellar", price: 1200 },
    batman: { name: "The Batman", price: 1200 },
    dune: { name: "Dune", price: 1200 },
    joker: { name: "Joker", price: 1200 },
    inception: { name: "Inception", price: 1200 }
};

// Test server
app.get("/", (req, res) => {
    res.send("CineBook Payment Server is running!");
});


const CINEMA_TZ = process.env.CINEMA_TZ || "Europe/Helsinki";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The seat page sends seat numbers 0..total-1 (0 = seat 1, the owner seat).
// The seats table stores labels that skip 13, so convert between the two.
const indexToLabel = (i) => String(i + 1 >= 13 ? i + 2 : i + 1);
const labelToIndex = (label) => (Number(label) >= 14 ? Number(label) - 2 : Number(label) - 1);

// GET seats of one show -> { show, room, taken: [indexes] }
app.get("/api/shows/:id/seats", async (req, res) => {
    try {
        const showId = Number(req.params.id);
        if (!Number.isInteger(showId)) {
            return res.status(400).json({ error: "Invalid show id" });
        }

        const showResult = await pool.query(
            `SELECT s.id, s.base_price,
                    to_char(s.start_at, 'Dy DD Mon HH24:MI') AS time,
                    m.title, r.id AS room_id, r.name AS room_name,
                    r.capacity, t.name AS theater
             FROM shows s
             JOIN movies m   ON m.id = s.movie_id
             JOIN rooms r    ON r.id = s.room_id
             JOIN theaters t ON t.id = r.theater_id
             WHERE s.id = $1`,
            [showId]
        );
        if (showResult.rows.length === 0) {
            return res.status(404).json({ error: "Show not found" });
        }
        const show = showResult.rows[0];

        const ticketResult = await pool.query(
            `SELECT st.seat_label
             FROM tickets tk
             JOIN bookings b ON b.id = tk.booking_id AND b.status <> 'cancelled'
             JOIN seats st   ON st.id = tk.seat_id
             WHERE tk.show_id = $1`,
            [showId]
        );

        // index 0 = owner seat, always taken
        const taken = new Set([0, ...ticketResult.rows.map((r) => labelToIndex(r.seat_label))]);

        res.json({
            show: { id: show.id, title: `${show.title} · ${show.time}`, price: show.base_price },
            room: { id: show.room_id, theater: show.theater, name: show.room_name, total: show.capacity },
            taken: [...taken].sort((a, b) => a - b)
        });
    } catch (err) {
        console.error("Seats error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Book seats -> 201, or 409 when a seat is already taken
app.post("/api/shows/:id/book", async (req, res) => {
    const showId = Number(req.params.id);
    const { seats, email } = req.body || {};

    if (!Number.isInteger(showId)) return res.status(400).json({ error: "Invalid show id" });
    if (typeof email !== "string" || !EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if (!Array.isArray(seats) || seats.length < 1 || seats.length > 6 || !seats.every(Number.isInteger)) {
        return res.status(400).json({ error: "Only 6 seat can be reserved by one user!" });
    }
    if (new Set(seats).size !== seats.length) return res.status(400).json({ error: "Duplicate seats" });
    if (seats.includes(0)) return res.status(400).json({ error: "Seat 1 is reserved for the owner" });

    const db = await pool.connect();
    try {
        const showResult = await db.query(
            `SELECT s.room_id, s.base_price, r.capacity
             FROM shows s JOIN rooms r ON r.id = s.room_id
             WHERE s.id = $1 AND s.status = 'scheduled'
               AND s.start_at > (now() AT TIME ZONE $2)`,
            [showId, CINEMA_TZ]
        );
        if (showResult.rows.length === 0) {
            return res.status(404).json({ error: "Show not found or already started" });
        }
        const { room_id, base_price, capacity } = showResult.rows[0];

        // match the chosen numbers to rows of the seats table (owner seat never matches)
        const seatResult = await db.query(
            `SELECT id FROM seats
             WHERE room_id = $1 AND seat_label = ANY($2::text[]) AND is_owner_seat = false`,
            [room_id, seats.map(indexToLabel)]
        );
        if (seats.some((n) => n < 0 || n >= capacity) || seatResult.rowCount !== seats.length) {
            return res.status(400).json({ error: "Seat does not exist in this room" });
        }

        // booking + tickets saved together; UNIQUE (show_id, seat_id) stops double booking
        await db.query("BEGIN");
        try {
            const booking = await db.query(
                `INSERT INTO bookings (show_id, guest_email, status, total_price)
                 VALUES ($1, $2, 'confirmed', $3) RETURNING id`,
                [showId, email.toLowerCase(), (base_price * seats.length).toFixed(2)]
            );
            await db.query(
                `INSERT INTO tickets (booking_id, show_id, seat_id, ticket_type, price)
                 SELECT $1, $2, unnest($3::int[]), 'adult', $4`,
                [booking.rows[0].id, showId, seatResult.rows.map((r) => r.id), base_price]
            );
            await db.query("COMMIT");
            res.status(201).json({ ok: true, booking_id: booking.rows[0].id, seats });
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

// Create Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
    try {
        const { movieId, quantity } = req.body;
        const movie = movies[movieId];

        if (!movie) {
            return res.status(400).json({
                error: "Invalid movie selected"
            });
        }

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
                        unit_amount: movie.price
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

// Start server
app.listen(PORT, () => {
    console.log(`CineBook server running on port ${PORT}`);
});
