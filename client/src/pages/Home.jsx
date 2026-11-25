import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import { useNavigate } from "react-router-dom";


const API_URL = "https://cinema-booking-web-app-server-rio-cinema-web-app.2.rahtiapp.fi";
//const API_URL = "http://localhost:5000";

export default function Home() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/api/movies`);
        const data = await res.json();
        setMovies(data);
      } catch (error) {
        console.error("Movie fetching error", error);
      }
    };
    fetchMovies();
  }, []);

  return (
    <>
      <Header aboutHref="about.html" contactHref="contact.html" />

      <section className="hero">
        <h1>Welcome to Rio Cinema</h1>
        <p>Book your favourite movies and enjoy the cinema experience.</p>
        <button onClick={() => navigate("/movies")}>Book Tickets</button>
      </section>

      <section className="movies">
        <h2>Popular Movies</h2>

        <div className="movie-container">
          {movies.slice(0, 3).map((movie) => (
            <div className="movie-card" key={movie.id}>
              <img
                src={movie.poster_url || "/doomsday.jpg"}
                alt={movie.title}
              />
              <h3>{movie.title}</h3>
              <p>
                {movie.age_rating}
                {movie.runtime_min && ` | ${movie.runtime_min} min`}
              </p>
              <button
                onClick={() => navigate("/showtimes", { state: { movie } })}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <p>© 2026 Rio Cinema. All rights reserved.</p>
      </footer>
    </>
  );
}