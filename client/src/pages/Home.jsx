import Header from "./Header.jsx";

export default function Home() {
  return (
    <>
      {/* Navigation bar */}
      <Header aboutHref="about.html" contactHref="contact.html" />

      {/* Main section */}
      <section className="hero">
        <h1>Welcome to Rio Cinema</h1>

        <p>Book your favourite movies and enjoy the cinema experience.</p>

        <button>Book Tickets</button>
      </section>

      {/* Movies section */}
      <section className="movies">
        <h2>Popular Movies</h2>

        <div className="movie-container">
          <div className="movie-card">
            <img src="/doomsday.jpg" alt="Movie 1" />
            <h3>Movie One</h3>
            <p>Action | Adventure</p>
            <button>Book Now</button>
          </div>

          <div className="movie-card">
            <img src="/doomsday.jpg" alt="Movie 1" />
            <h3>Movie Two</h3>
            <p>Drama | Romance</p>
            <button>Book Now</button>
          </div>

          <div className="movie-card">
            <img src="/doomsday.jpg" alt="Movie 1" />
            <h3>Movie Three</h3>
            <p>Comedy | Family</p>
            <button>Book Now</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>© 2026 Rio Cinema. All rights reserved.</p>
      </footer>
    </>
  );
}
