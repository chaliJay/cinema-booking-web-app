import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import "./booking.css";

/*const movies = [
  { id: "avatar", title: "Avatar", genre: "Action Adventure", label: "Action | Adventure", rating: "7.9", img: "Avatar", alt: "Avatar poster" },
  { id: "interstellar", title: "Interstellar", genre: "Sci-Fi Drama", label: "Sci-Fi | Drama", rating: "8.7", img: "Interstellar", alt: "Interstellar poster" },
  { id: "batman", title: "The Batman", genre: "Action Thriller", label: "Action | Thriller", rating: "7.8", img: "Batman", alt: "Batman poster" },
  { id: "dune", title: "Dune", genre: "Sci-Fi Adventure", label: "Sci-Fi | Adventure", rating: "8.5", img: "Dune", alt: "Dune poster" },
  { id: "joker", title: "Joker", genre: "Drama Thriller", label: "Drama | Thriller", rating: "8.1", img: "Joker", alt: "Joker poster" },
  { id: "inception", title: "Inception", genre: "Sci-Fi Thriller", label: "Sci-Fi | Thriller", rating: "8.8", img: "Inception", alt: "Inception poster" },
];
*/
const ticketPrice = 12;

export default function Movies() {
  // ---------- Search and genre filter ----------
  const [searchValue, setSearchValue] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [movies, setMovies] = useState([]);

  useEffect(()=> {
    const fetchMovies = async () => {
        try{
      const response = await fetch("http://localhost:5000/api/movies");

      const data = await response.json();
      
      setMovies(data);

    }
    catch(error){
      console.error("Movie fetching error", error);
    }
  };

  fetchMovies();

  },[]);

  function isVisible(movie) {
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(searchValue.toLowerCase());

    const matchesGenre =
      selectedGenre === "all" || movie.genre.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  }

  function handleReset() {
    setSearchValue("");
    setSelectedGenre("all");
  }

  // ---------- Booking system ----------
  const [modalOpen, setModalOpen] = useState(false);
  const [currentMovieId, setCurrentMovieId] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState("Movie");
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [bookingMessage, setBookingMessage] = useState("");
  const [paying, setPaying] = useState(false);

  // Open booking modal
  function openModal(movie) {
    setCurrentMovieId(movie.id);
    setSelectedMovie(movie.title);
    setTicketQuantity(1);
    setBookingMessage("");
    setModalOpen(true);
  }

  // Close modal
  function closeModal() {
    setModalOpen(false);
  }

  // Calculate total price
  function getTotalPriceText() {
    const quantity = Number(ticketQuantity);

    if (quantity >= 1 && quantity <= 10) {
      const total = quantity * ticketPrice;
      return `Total: €${total.toFixed(2)}`;
    } else {
      return "Select 1 to 10 tickets";
    }
  }

  // ---------- Stripe payment ----------
  async function handlePayNow() {
    const quantity = Number(ticketQuantity);

    if (!currentMovieId) {
      setBookingMessage("Please select a movie.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      setBookingMessage("Please select between 1 and 10 tickets.");
      return;
    }

    setPaying(true);
    setBookingMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/create-checkout-session",
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
        throw new Error(data.error || "Payment session failed.");
      }

      if (!data.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      // Redirect customer to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Payment error:", error);

      setBookingMessage(
        error.message || "Unable to connect to payment server."
      );

      setPaying(false);
    }
  }

  return (
    <>
      <Header />

      <section className="movies-hero">
        <h1>Explore Movies</h1>
        <p>Discover your next favourite movie and book your cinema experience.</p>
      </section>

      <section className="movie-filters">
        <input
          type="text"
          id="searchInput"
          placeholder="Search for a movie..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />

        <select
          id="genreFilter"
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
        >
          <option value="all">All Genres</option>
          <option value="Action">Action</option>
          <option value="Adventure">Adventure</option>
          <option value="Drama">Drama</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Thriller">Thriller</option>
        </select>

        <button id="resetBtn" onClick={handleReset}>Reset</button>
      </section>

      <section className="movies">
        <h2>Upcoming Movies</h2>

        <div className="movie-container">
          {movies.map((movie) => (
            <div
              className="movie-card"
              data-genre={movie.genre}
              key={movie.id}
              style={{ display: isVisible(movie) ? "block" : "none" }}
            >
              <img
                src={movie.poster_url}
                alt={movie.alt}
              />
              <h3>{movie.title}</h3>
              <h3>{movie.id}</h3>
              <p>{movie.label}</p>
              <p>⭐ {movie.age_raating}/10</p>
              <button
                className="book-btn"
                data-movie-id={movie.id}
                onClick={() => openModal(movie)}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Booking Modal */}
      <div
        className="booking-modal"
        id="bookingModal"
        style={{ display: modalOpen ? "flex" : "none" }}
      >
        <div className="booking-content">
          <h2>Book Your Tickets</h2>

          <p id="selectedMovie">{selectedMovie}</p>

          <label htmlFor="ticketQuantity">Number of tickets:</label>

          <input
            type="number"
            id="ticketQuantity"
            min="1"
            max="10"
            value={ticketQuantity}
            onChange={(e) => setTicketQuantity(e.target.value)}
          />

          <h3 id="totalPrice">{getTotalPriceText()}</h3>

          <button id="payNowBtn" onClick={handlePayNow} disabled={paying}>
            {paying ? "Connecting to Stripe..." : "Proceed to Payment"}
          </button>

          <button id="closeModalBtn" onClick={closeModal}>Cancel</button>

          <p id="bookingMessage" role="alert">{bookingMessage}</p>
        </div>
      </div>

      <footer>
        <h3>Rio Cinema</h3>
        <p>Your movie experience starts here.</p>
        <p>© 2026 Rio Cinema. All rights reserved.</p>
      </footer>
    </>
  );
}
