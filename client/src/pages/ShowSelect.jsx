import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import "./ShowSelect.css";
import API_URL from "../config.js";

export default function ShowSelect() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const movie = state?.movie;

  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theater, setTheater] = useState(null);
  const [show, setShow] = useState(null);

  // load theaters and shows for this movie
  useEffect(() => {
    if (!movie) return;

    const fetchShows = async () => {
      try {
        const res = await fetch(`${API_URL}/api/movies/${movie.id}/shows`);
        const data = await res.json();
        setTheaters(data);
      } catch (error) {
        console.error("Show fetching error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, [movie?.id]);

  // opened the page directly without choosing a movie
  if (!movie) {
    return (
      <>
        <Header />
        <div className="show-page">
          <h2>No movie selected</h2>
          <button className="show-continue" onClick={() => navigate("/movies")}>
            Choose a movie
          </button>
        </div>
      </>
    );
  }

  const chooseTheater = (t) => {
    setTheater(t);
    setShow(null);
  };

  const goToSeats = () => {
    navigate("/seats", { state: { movie, theater, show } });
  };

  return (
    <>
      <Header />
      <div className="show-page">
        <h2>{movie.title}</h2>

        {loading && <p>Loading shows...</p>}

        {!loading && theaters.length === 0 && (
          <p>No upcoming shows for this movie.</p>
        )}

        {theaters.length > 0 && (
          <>
            <h3>1. Select Theater</h3>
            <div className="show-list">
              {theaters.map((t) => (
                <button
                  key={t.id}
                  className={`show-btn ${theater?.id === t.id ? "active" : ""}`}
                  onClick={() => chooseTheater(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </>
        )}

        {theater && (
          <>
            <h3>2. Select Time</h3>
            <div className="show-list">
              {theater.shows.map((s) => (
                <button
                  key={s.id}
                  className={`show-btn ${show?.id === s.id ? "active" : ""}`}
                  onClick={() => setShow(s)}
                >
                  {s.day} · {s.time}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          className="show-continue"
          disabled={!theater || !show}
          onClick={goToSeats}
        >
          Select Seats
        </button>
      </div>
    </>
  );
}