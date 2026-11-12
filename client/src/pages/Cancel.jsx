import { Link } from "react-router-dom";

export default function Cancel() {
  return (
    <section style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#d9534f" }}>Payment Cancelled</h1>

      <h2>Your booking was not completed.</h2>

      <p>Don't worry! No successful payment was recorded through this checkout.</p>

      <br />

      <Link to="/movies">
        <button>Try Booking Again</button>
      </Link>

      <br /><br />

      <Link to="/">Return to Home</Link>
    </section>
  );
}
