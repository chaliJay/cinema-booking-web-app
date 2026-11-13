import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "https://cinema-booking-web-app-server-rio-cinema-web-app.2.rahtiapp.fi";
// const API_URL ="http://localhost:5000";


export default function Success() {
  const [status, setStatus] = useState("Verifying your payment...");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    async function verifyPayment() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");

      if (!sessionId) {
        setStatus("No payment session was provided.");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`
        );

        const data = await response.json();

        if (!response.ok || !data.paid) {
          setStatus("Payment could not be verified. Please contact support.");
          return;
        }

        setStatus("Your payment has been verified successfully!");
        setDetails(data);
      } catch (error) {
        console.error(error);
        setStatus("Unable to verify payment. Please try again.");
      }
    }

    verifyPayment();
  }, []);

  return (
    <section style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "green" }}>✓ Payment Successful!</h1>

      <h2>Thank you for booking with Rio Cinema!</h2>

      <p id="paymentStatus">{status}</p>

      <div id="bookingDetails">
        {details && (
          <>
            <h3>Booking Details</h3>
            <p>Movie: {details.movie}</p>
            <p>Amount paid: €{(details.amount / 100).toFixed(2)}</p>
            <p>Payment status: Paid</p>
          </>
        )}
      </div>

      <br />

      <Link to="/movies">
        <button>Book More Movies</button>
      </Link>

      <br /><br />

      <Link to="/">Return to Home</Link>
    </section>
  );
}
