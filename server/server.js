
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

// Allowed frontend addresses
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
            success_url:
                `${origin}/cinema-booking-web-app/client/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:
                `${origin}/cinema-booking-web-app/client/cancel.html`
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
