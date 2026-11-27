
import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import "./booking.css";
import { useNavigate } from "react-router-dom";
import API_URL from "../config.js";

const ticketPrice = 12;

export default function Movies() {
  const navigate = useNavigate();
  // Movies and filters
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Fetch movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setFetchError("");

        const response = await fetch(`${API_URL}/api/movies`);

        if (!response.ok) {
          throw new Error("Unable to load movies.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid movie data received.");
        }

        setMovies(data);
      } catch (error) {
        console.error("Movie fetching error:", error);
        setFetchError(
          "We couldn't load the movies. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Search and genre filtering
  function isVisible(movie) {
    const title = movie.title || "";

    const matchesSearch = title
      .toLowerCase()
      .includes(searchValue.toLowerCase().trim());

    const genre = Array.isArray(movie.genre)
      ? movie.genre
      : [movie.genre || ""];

    const matchesGenre =
      selectedGenre === "all" ||
      genre.some((item) =>
        item.toLowerCase().trim() === selectedGenre.toLowerCase()
      );

    return matchesSearch && matchesGenre;
  }

  const filteredMovies = movies.filter(isVisible);

  function handleReset() {
    setSearchValue("");
    setSelectedGenre("all");
  }


  return (
    <>
      <Header />

      <main className="movies-page">

        {/* MOVIE COLLECTION */}
        <section className="movie-section" id="movieCollection">

          <div className="movie-section-heading">
            <div>
              <span className="section-eyebrow">
                FIND YOUR NEXT EXPERIENCE
              </span>

              <h2>
                Now Showing <span>&</span> Upcoming
              </h2>

              <p>
                Find the perfect film for your next cinema experience.
              </p>
            </div>

            <div className="movie-count">
              <span>{filteredMovies.length}</span>
              <small>MOVIES</small>
            </div>
          </div>

          {/* SEARCH AND FILTER */}
          <div className="movie-toolbar">

            <div className="movie-search">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search movies by title..."
                value={searchValue}
                onChange={(e) =>
                  setSearchValue(e.target.value)
                }
              />

              {searchValue && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearchValue("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="movie-filter">
              <select
                value={selectedGenre}
                onChange={(e) =>
                  setSelectedGenre(e.target.value)
                }
                aria-label="Filter movies by genre"
              >
                <option value="all">All Genres</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
                <option value="Drama">Drama</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Thriller">Thriller</option>
              </select>
            </div>

            <button
              className="movie-reset-btn"
              onClick={handleReset}
              type="button"
            >
              Reset Filters
            </button>

          </div>

          {/* LOADING */}
          {loading && (
            <div className="movie-status">
              <div className="movie-spinner"></div>
              <p>Preparing your movie experience...</p>
            </div>
          )}

          {/* ERROR */}
          {!loading && fetchError && (
            <div className="movie-status movie-error">
              <h3>Something went wrong</h3>
              <p>{fetchError}</p>
              <button
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          )}

          {/* MOVIE CARDS */}
          {!loading && !fetchError && filteredMovies.length > 0 && (
            <div className="movie-grid">

              {filteredMovies.map((movie) => {
                const genres = Array.isArray(movie.genre)
                  ? movie.genre
                  : (movie.genre || "")
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean);

                return (
                  <article
                    className="premium-movie-card"
                    key={movie.id}
                  >

                    <div className="movie-poster">
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        loading="lazy"
                      />

                      <div className="poster-overlay"></div>

                      {movie.age_rating && (
                        <span className="movie-age">
                          {movie.age_rating}
                        </span>
                      )}

                      <div className="poster-details">
                        <span className="poster-label">
                          RIO CINEMA PRESENTS
                        </span>

                        <h3>{movie.title}</h3>

                        <button
                          className="poster-book-btn"
                          onClick={() =>
                            navigate("/showtimes", {
                              state: { movie }
                            })
                          }
                        >
                          BOOK YOUR TICKETS <span>→</span>
                        </button>
                      </div>
                    </div>

                    <div className="movie-card-info">

                      <div className="movie-card-title-row">
                        <h3>{movie.title}</h3>
                        <span className="movie-id">
                          #{movie.id}
                        </span>
                      </div>

                      <div className="movie-meta">
                        {genres.slice(0, 3).map((genre, index) => (
                          <span key={index}>
                            {genre}
                          </span>
                        ))}

                        {movie.runtime_min && (
                          <span>
                            {movie.runtime_min} min
                          </span>
                        )}
                      </div>

                      <p className="movie-description">
                        {movie.label ||
                          "Experience this movie on the big screen at Rio Cinema."}
                      </p>

                      <div className="movie-card-bottom">
                        <div className="movie-price">
                          <small>STARTING FROM</small>
                          <strong>€{ticketPrice.toFixed(2)}</strong>
                        </div>

                        <button
                          className="book-btn"
                          onClick={() =>
                            navigate("/showtimes", {
                              state: { movie }
                            })
                          }
                        >
                          Book Now <span>→</span>
                        </button>
                      </div>

                    </div>
                  </article>
                );
              })}

            </div>
          )}

          {/* NO RESULTS */}
          {!loading && !fetchError && filteredMovies.length === 0 && (
            <div className="movie-status no-movies">
              <span>✦</span>
              <h3>No movies found</h3>
              <p>
                We couldn't find any movies matching your search.
                Try another title or genre.
              </p>

              <button onClick={handleReset}>
                Show All Movies
              </button>
            </div>
          )}

        </section>

        {/* CINEMA EXPERIENCE BANNER */}
        <section className="movies-experience">
          <div className="experience-content">
            <span>YOUR SEAT. YOUR STORY. YOUR CINEMA.</span>

            <h2>
              Every Movie Deserves
              <em> The Big Screen.</em>
            </h2>

            <p>
              Get ready for unforgettable stories,
              incredible moments and the magic of Rio Cinema.
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="movies-footer">
        <h3>RIO <span>CINEMA</span></h3>

        <p>
          More than just a movie. It's an experience.
        </p>

        <div className="footer-line"></div>

        <small>
          © 2026 Rio Cinema. All rights reserved.
        </small>
      </footer>

    </>
  );
}
