import { useState } from "react";
import "./SeatReservation.css";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SEATS_PER_ROW = 10;
const SKIP_13 = true; // set false to show 1..100
const MAX_SEATS = 6; // max seats one user can book

// Build 100 seats with snake numbering
function buildSeats() {
  const seats = [];
  ROWS.forEach((row, r) => {
    for (let p = 0; p < SEATS_PER_ROW; p++) {
      const base = r * SEATS_PER_ROW;
      // even rows: left to right, odd rows: right to left
      let n = r % 2 === 0 ? base + p + 1 : base + SEATS_PER_ROW - p;
      if (SKIP_13 && n >= 13) n += 1;
      seats.push({ id: `${row}${p + 1}`, row, number: n });
    }
  });
  return seats;
}

const ALL_SEATS = buildSeats();

export default function SeatReservation() {
  const [booked, setBooked] = useState([]);

const bookSeat = (id) => {
  if (booked.includes(id)) return; // already booked

  setBooked((prev) => {
    const next = [...prev, id];
    // more than 6? remove the first (oldest) one
    return next.length > MAX_SEATS ? next.slice(1) : next;
  });
};

  return (
    <div className="seat-page">
      <h2>Select Your Seat</h2>
      <p className="seat-hall">Hall 100</p>

      {/* keep your screen code here (div or svg) */}
      <div className="seat-screen"></div>
      <p className="seat-screen-text">SCREEN SIDE</p>

      <div>
        {ROWS.map((row) => (
          <div className="seat-row" key={row}>
            <span className="seat-row-label">{row}</span>
            {ALL_SEATS.filter((s) => s.row === row).map((seat) => {
              const isBooked = booked.includes(seat.id);
              return (
                <button
                  key={seat.id}
                  disabled={isBooked}
                  className={`seat-btn ${isBooked ? "booked" : ""}`}
                  onClick={() => bookSeat(seat.id)}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="seat-info">
        Booked: {booked.length ? booked.join(", ") : "none"}
      </p>

    </div>
  );
}