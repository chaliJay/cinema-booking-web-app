import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import "./account.css";

const API_URL = "http://localhost:5000";

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("rioToken");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load account.");
        }

        setUser(data.user || data);
      })
      .catch((error) => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("rioToken");
    localStorage.removeItem("rioUser");
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  }

  return (
    <>
      <Header />

      <main className="account-page">
        <div className="account-card">
          <h1>My Account</h1>

          {loading && <p>Loading account...</p>}

          {!loading && user && (
            <>
              <div className="account-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>

              <h2>{user.name}</h2>
              <p className="account-email">{user.email}</p>

              <div className="account-details">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
              </div>

              <button onClick={() => navigate("/movies")}>
                Browse Movies
              </button>

              <button className="logout-button" onClick={handleLogout}>
                Log Out
              </button>
            </>
          )}

          {!loading && !user && (
            <>
              <p className="account-error">
                {message || "Unable to load your account."}
              </p>
              <button onClick={() => navigate("/login")}>
                Go to Login
              </button>
            </>
          )}
        </div>
      </main>
    </>
  );
}