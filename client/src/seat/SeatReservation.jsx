import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SeatReservation.css";
import "../pages/booking.css";
import Header from "../pages/Header.jsx";

// const API_URL = "https://cinema-booking-web-app-server-rio-cinema-web-app.2.rahtiapp.fi";
const API = "http://localhost:5000";

const ROWS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const SEATS_PER_ROW = 10;
const SKIP_13 = true;
const MAX_SEATS = 6;
const MAX_TICKETS = 6;

function buildSeats() {
  const seats = [];
  ROWS.forEach((row, r) => {
    for (let p = 0; p < SEATS_PER_ROW; p++) {
      const base = r * SEATS_PER_ROW;
      let n = r % 2 === 0 ? base + p + 1 : base + SEATS_PER_ROW - p;
      if (SKIP_13 && n >= 13) n += 1;
      seats.push({ id: `${row}-${p + 1}`, row, number: n });
    }
  });
  return seats;
}

const ALL_SEATS = buildSeats();

export default function SeatReservation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { movie, theater, show } = state || {};

  const [selected, setSelected] = useState([]); // clicked, not saved yet
  const [booked, setBooked] = useState([]);     // saved in the database
  const [restricted, setRestricted] = useState([]); 
  const [modalOpen, setModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");

  const price = show?.price ?? 12;
  const total = selected.length * price;

  // load booked seats for this show
  const loadBooked = async () => {
    const res = await fetch(`${API}/api/shows/${show.id}/booked-seats`);
    const data = await res.json();
    const ids = ALL_SEATS.filter((s) =>
      data.some(
        (b) => b.row_label === s.row && b.seat_label === String(s.number)
      )
    ).map((s) => s.id);
    setBooked(ids);
  };

  const loadRestricted = async () => {
    const res = await fetch(`${API}/api/shows/${show.id}/restricted-seats`);
    const data = await res.json();
    const ids = ALL_SEATS.filter((s) =>
      data.some(
        (r) => r.row_label === s.row && r.seat_label === String(s.number)
      )
    ).map((s) => s.id);
    setRestricted(ids);
  };

  useEffect(() => {
    if (show) {
      loadBooked().catch(console.error);
      loadRestricted().catch(console.error);
    }
  }, [show?.id]);

  // opened the page directly, without choosing a show
  if (!show) {
    return (
      <div className="seat-page">
        <h2>No show selected</h2>
        <button className="seat-confirm-btn" onClick={() => navigate("/movies")}>
          Choose a movie
        </button>
      </div>
    );
  }

  const toggleSeat = (id) => {
    if (booked.includes(id) || restricted.includes(id)) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      const next = [...prev, id];
      return next.length > MAX_SEATS ? next.slice(1) : next; // drop the oldest
    });
  };

  const openModal = () => {
    if (selected.length === 0) return;
    setMessage("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // save booking + tickets in Postgres
  const saveBooking = async () => {
    const seats = ALL_SEATS.filter((s) => selected.includes(s.id)).map((s) => ({
      row: s.row,
      number: s.number,
    }));

    const res = await fetch(`${API}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showId: show.id, seats }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Booking failed");
    return data;
  };

  const handlePayNow = async () => {
    setPaying(true);
    setMessage("");
    try {
      await saveBooking(); // 1. save to the database

      const response = await fetch(`${API}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie?.id, quantity: selected.length }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment session failed.");
      if (!data.url) throw new Error("Stripe did not return a checkout URL.");

      window.location.href = data.url; // 2. go to Stripe
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
      setPaying(false);
      loadBooked().catch(console.error); // refresh in case a seat was taken
    }
  };

  return (
    <>
    <Header />

    <div className="seat-page">
      <div className="seat-layout">
        <div className="seat-main">
          <div className="seat-screen"></div>
          <p className="seat-screen-text">SCREEN SIDE</p>

          <div>
            {ROWS.map((row) => (
              <div className="seat-row" key={row}>
                <span className="seat-row-label">{row}</span>

                {ALL_SEATS.filter((s) => s.row === row).map((seat) => {
                  const isBooked = booked.includes(seat.id);
                  const isSelected = selected.includes(seat.id);
                  const isRestricted = restricted.includes(seat.id);
                  return (
                    <button
                      key={seat.id}
                      disabled={isBooked || isRestricted}
                      title={isRestricted ? "Admin only" : ""}
                      className={`seat-btn ${isSelected ? "selected" : ""} ${
                        isBooked ? "booked" : ""
                      } ${isRestricted ? "restricted" : ""}`}
                      onClick={() => toggleSeat(seat.id)}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="seat-info">
            Selected: {selected.length ? selected.length + " seat(s)" : "none"}
          </p>

          <button
            className="seat-confirm-btn"
            onClick={openModal}
            disabled={selected.length === 0}
          >
            Confirm Booking
          </button>
        </div>

        {/* RIGHT: movie info */}
        {movie && (
          <aside className="seat-side">
            <span className="modal-eyebrow">RIO CINEMA EXPERIENCE</span>

            <h2 className="seat-hall">
              {theater?.name} | {show.day} {show.time}
            </h2>

            <div className="modal-movie">
              <img src={movie.poster_url} alt={movie.title} />
              <div>
                <h3>{movie.title}</h3>
                <p>
                  {movie.age_rating || "Movie"}
                  {movie.runtime_min ? ` • ${movie.runtime_min} min` : ""}
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* BOOKING MODAL */}
      {modalOpen && movie && (
        <div
          className="booking-modal"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="booking-content">

            <button
              className="modal-close"
              onClick={closeModal}
              disabled={paying}
              aria-label="Close booking window"
            >
              ×
            </button>

            <span className="modal-eyebrow">
              RIO CINEMA EXPERIENCE
            </span>

            <h2>Book Your Tickets</h2>

            <div className="modal-movie">
              <img
                src={movie.poster_url}
                alt={movie.title}
              />

              <div>
                <h3>{movie.title}</h3>
                <p>
                  {movie.age_rating || "Movie"}
                  {movie.runtime_min
                    ? ` • ${movie.runtime_min} min`
                    : ""}
                </p>
              </div>
            </div>

            <div className="price-summary">
              <div>
                <span>Ticket price</span>
                <strong>€{total.toFixed(2)}</strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>× {selected.length}</strong>
              </div>

              <div className="total-row">
                <span>Total amount</span>
                <strong>
                  €{total.toFixed(2)}
                </strong>
              </div>
            </div>

            {message && (
              <p className="booking-message" role="alert">
                {message}
              </p>
            )}

            <button
              className="modal-pay-btn"
              onClick={handlePayNow}
              disabled={paying}
            >
              {paying
                ? "CONNECTING TO STRIPE..."
                : `PROCEED TO PAYMENT · €${total.toFixed(2)}`}
            </button>

            <p className="secure-payment">
              🔒 Secure checkout powered by Stripe
            </p>

            <button
              className="modal-cancel"
              onClick={closeModal}
              disabled={paying}
            >
              Cancel Booking
            </button>

          </div>
        </div>
      )}
    </div>

    </>
    
  );
}