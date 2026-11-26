
import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import "./booking.css";

const ticketPrice = 12;
const MAX_TICKETS = 6;

// Local development
const API_URL = "http://localhost:5000";

// For deployment, use:
// const API_URL = "https://cinema-booking-web-app-server-rio-cinema-web-app.2.rahtiapp.fi";

export default function Movies() {
  // Movies and filters
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Booking modal
  const [modalOpen, setModalOpen] = useState(false);
  const [currentMovieId, setCurrentMovieId] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [bookingMessage, setBookingMessage] = useState("");
  const [paying, setPaying] = useState(false);

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

  // Open booking modal
  function openModal(movie) {
    setCurrentMovieId(movie.id);
    setSelectedMovie(movie);
    setTicketQuantity(1);
    setBookingMessage("");
    setModalOpen(true);
  }

  // Close booking modal
  function closeModal() {
    if (paying) return;

    setModalOpen(false);
    setBookingMessage("");
  }

  // Close modal with Escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && modalOpen && !paying) {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [modalOpen, paying]);

  // Ticket quantity
  const quantity = Number(ticketQuantity);
  const validQuantity =
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= MAX_TICKETS;

  const totalPrice = validQuantity
    ? quantity * ticketPrice
    : 0;

  // Stripe payment
  async function handlePayNow() {
    if (!currentMovieId) {
      setBookingMessage("Please select a movie.");
      return;
    }

    if (!validQuantity) {
      setBookingMessage(
        "Please select between 1 and 6 tickets."
      );
      return;
    }

    setPaying(true);
    setBookingMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            movieId: currentMovieId,
            quantity: quantity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Payment session failed."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe did not return a checkout URL."
        );
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Payment error:", error);

      setBookingMessage(
        error.message ||
        "Unable to connect to the payment server."
      );

      setPaying(false);
    }
  }

  return (
    <>
      <Header />

      <main className="movies-page">

        {/* HERO SECTION */}
        {/* <section className="movies-hero">
          <div className="movies-hero-overlay"></div>

          <div className="movies-hero-content">
            <span className="movies-eyebrow">
              THE MAGIC OF CINEMA
            </span>

            <h1>
              Discover Your Next
              <span> Favourite Movie.</span>
            </h1>

            <p>
              Great stories deserve the big screen.
              Explore our movies and make your next
              movie night unforgettable.
            </p>

            <a href="#movieCollection" className="hero-explore-btn">
              EXPLORE MOVIES <span>↓</span>
            </a>
          </div>
        </section>
 */}
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
                          onClick={() => openModal(movie)}
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
                          onClick={() => openModal(movie)}
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

      {/* BOOKING MODAL */}
      {modalOpen && selectedMovie && (
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
                src={selectedMovie.poster_url}
                alt={selectedMovie.title}
              />

              <div>
                <h3>{selectedMovie.title}</h3>
                <p>
                  {selectedMovie.age_rating || "Movie"}
                  {selectedMovie.runtime_min
                    ? ` • ${selectedMovie.runtime_min} min`
                    : ""}
                </p>
              </div>
            </div>

            <div className="ticket-selection">
              <div>
                <label htmlFor="ticketQuantity">
                  Number of tickets
                </label>
                <p>Choose up to 6 tickets</p>
              </div>

              <div className="quantity-control">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() =>
                    setTicketQuantity(Math.max(1, quantity - 1))
                  }
                >
                  −
                </button>

                <span>{ticketQuantity}</span>

                <button
                  type="button"
                  disabled={quantity >= MAX_TICKETS}
                  onClick={() =>
                    setTicketQuantity(
                      Math.min(MAX_TICKETS, quantity + 1)
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className="price-summary">
              <div>
                <span>Ticket price</span>
                <strong>€{ticketPrice.toFixed(2)}</strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>× {ticketQuantity}</strong>
              </div>

              <div className="total-row">
                <span>Total amount</span>
                <strong>
                  €{totalPrice.toFixed(2)}
                </strong>
              </div>
            </div>

            {bookingMessage && (
              <p className="booking-message" role="alert">
                {bookingMessage}
              </p>
            )}

            <button
              className="modal-pay-btn"
              onClick={handlePayNow}
              disabled={paying || !validQuantity}
            >
              {paying
                ? "CONNECTING TO STRIPE..."
                : `PROCEED TO PAYMENT · €${totalPrice.toFixed(2)}`}
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
