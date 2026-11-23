
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Header({
  aboutHref = "#",
  contactHref = "#"
}) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rioUser"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    function updateUser() {
      try {
        setUser(JSON.parse(localStorage.getItem("rioUser")));
      } catch {
        setUser(null);
      }
    }

    window.addEventListener("authChanged", updateUser);

    return () => {
      window.removeEventListener("authChanged", updateUser);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("rioToken");
    localStorage.removeItem("rioUser");

    setUser(null);
    window.dispatchEvent(new Event("authChanged"));

    navigate("/");
  }

  return (
    <header>
      <h2>Rio Cinema</h2>

      <nav>
        <Link to="/">Home</Link>
        <Link to="/movies">Movies</Link>

        <a href={aboutHref}>About</a>
        <a href={contactHref}>Contact</a>

        {user ? (
          <>
            <span>Hi, {user.name}</span>

            <Link to="/account">My Account</Link>

            <button onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}
