
import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import { useNavigate } from "react-router-dom";
import "./home.css";

const API_URL = "http://localhost:5000";

export default function Home() {
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check whether the user is logged in
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem("rioToken"))
  );

  // Fetch movies from backend
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/api/movies`);

        if (!res.ok) {
          throw new Error("Failed to fetch movies");
        }

        const data = await res.json();
        setMovies(data);

      } catch (error) {
        console.error("Movie fetching error", error);

      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Check login status when user clicks
  const handleExperienceClick = () => {
    const token = localStorage.getItem("rioToken");

    if (token) {
      navigate("/movies");
    } else {
      navigate("/login");
    }
  };

  return (
    <>
      <Header
        aboutHref="about.html"
        contactHref="contact.html"
      />

      <main className="home-page">

        {/* ==============================
            HERO SECTION
        ============================== */}

        <section className="hero">
          <video className="hero-video" autoPlay muted loop playsInline>
            <source src="/RIO_Cinema.mp4" type="video/mp4" />
          </video>

          <div className="hero-overlay"></div>

          <div className="hero-content">

            <span className="hero-tag">
              WELCOME TO RIO CINEMA
            </span>

            <h1>
              Experience Movies
              <br />
              <span>Like Never Before.</span>
            </h1>

            <p>
              Discover the extraordinary cinema experience.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-btn"
                onClick={() => navigate("/movies")}
              >
                Explore Movies <span>→</span>
              </button>

            </div>

            {/* HERO STATISTICS */}

            <div className="hero-stats">

              <div>
                <h3>BIG</h3>
                <span>Screen Experience</span>
              </div>

              <div>
                <h3>BEST</h3>
                <span>Movie Experience</span>
              </div>

              <div>
                <h3>YOU</h3>
                <span>Choose Your Show</span>
              </div>

            </div>

          </div>

        </section>


        {/* ==============================
            POPULAR MOVIES SECTION
        ============================== */}

        <section className="movies">

          <div className="section-heading">

            <div>

              <span className="section-tag">
                NOW SHOWING
              </span>

              <h2 style={{ color: "white" }}>
                Discover Our Movies
              </h2>

              <p>
                Find your next favourite movie and book your experience.
              </p>

            </div>

            <button
              className="view-all-btn"
              onClick={() => navigate("/movies")}
            >
              Explore All Movies →
            </button>

          </div>


          {/* MOVIE CARDS */}

          {loading ? (

            <p className="no-movies">
              Loading movies...
            </p>

          ) : movies.length > 0 ? (

            <div className="movie-container">

              {movies.slice(0, 3).map((movie) => (

                <div className="movie-card" key={movie.id}>

                  {/* MOVIE POSTER */}

                  <div className="movie-poster">

                    <img
                      src={movie.poster_url || "/doomsday.jpg"}
                      alt={movie.title}
                    />

                  </div>


                  {/* MOVIE DETAILS */}

                  <div className="movie-info">

                    <span className="movie-label">
                      FEATURED MOVIE
                    </span>

                    <h3 style={{ color: "white" }}>{movie.title}</h3>

                    <div className="movie-meta">

                      <span>
                        {movie.age_rating || "All Ages"}
                      </span>

                      {movie.runtime_min && (
                        <>
                          <span className="meta-dot">•</span>

                          <span>
                            {movie.runtime_min} min
                          </span>
                        </>
                      )}

                    </div>

                    <div className="movie-divider"></div>


                    {/* BOOKING BUTTON */}

                    <button
                      className="movie-book-btn"
                      onClick={() =>
                        navigate("/showtimes", {
                          state: { movie }
                        })
                      }
                    >
                      Book Tickets <span>→</span>
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <p className="no-movies">
              No movies available at the moment.
              Please check back later.
            </p>

          )}

        </section>


        {/* ==============================
            RIO EXPERIENCE SECTION
        ============================== */}

        <section className="experience">

          <div className="experience-content">

            <span className="section-tag">
              THE RIO EXPERIENCE
            </span>

            <h2>
              More Than Just
              <br />
              <span>A Movie.</span>
            </h2>

            <p>
              Great movies deserve a great experience.
              Join us at Rio Cinema and make every movie night memorable.
            </p>

            <button
              className="primary-btn experience-btn"
              onClick={handleExperienceClick}
            >

              {isAuthenticated
                ? "Book Your Tickets →"
                : "Login / Sign Up →"
              }

            </button>

            {!isAuthenticated && (

              <p className="login-message">
                Please log in or create an account to book your tickets and get great deals.
              </p>

            )}

          </div>

        </section>

      </main>


      {/* ==============================
          FOOTER
      ============================== */}

      <footer className="home-footer">

        <h2>
          RIO <span>CINEMA</span>
        </h2>

        <p>
          Making every movie moment unforgettable.
        </p>

        <div className="footer-line"></div>

        <p className="copyright">
          © 2026 Rio Cinema. All rights reserved.
        </p>

      </footer>

    </>
  );
}
