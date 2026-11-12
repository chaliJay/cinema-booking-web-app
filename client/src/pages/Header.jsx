import { Link } from "react-router-dom";

// aboutHref / contactHref keep the original links of each page
// (home.html used about.html / contact.html, movies.html used "#")
export default function Header({ aboutHref = "#", contactHref = "#" }) {
  return (
    <header>
      <h2>CineBook</h2>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/movies">Movies</Link>
        <a href={aboutHref}>About</a>
        <a href={contactHref}>Contact</a>
      </nav>
    </header>
  );
}
