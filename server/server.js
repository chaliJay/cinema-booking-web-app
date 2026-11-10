
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const PORT = 5000;

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from .env");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5173"
    ]
}));

app.use(express.json());

// Sample movie catalogue.
// Prices are in EUR cents (1200 = €12.00).
const movies = {
    avatar: {
        name: "Avatar",
        price: 1200
    },
    interstellar: {
        name: "Interstellar",
        price: 1200
    },
    batman: {
        name: "The Batman",
        price: 1200
    },
    dune: {
        name: "Dune",
        price: 1200
    },
    joker: {
        name: "Joker",
        price: 1200
    },
    inception: {
        name: "Inception",
        price: 1200
    }
};

// Test backend
app.get("/", (req, res) => {
    res.send("CineBook Payment Server is running!");
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

        const allowedOrigins = [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:5173"
        ];

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

        res.json({
            url: session.url
        });

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

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return res.status(400).json({
                paid: false,
                error: "Payment has not been completed"
            });
        }

        res.json({
            paid: true,
            movie: session.line_items
                ? "CineBook movie booking"
                : "CineBook booking",
            amount: session.amount_total
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
