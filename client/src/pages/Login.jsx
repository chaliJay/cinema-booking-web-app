
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import "./auth.css";
import API_URL from "../config.js";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      localStorage.setItem("rioToken", data.token);
      localStorage.setItem("rioUser", JSON.stringify(data.user));

      window.dispatchEvent(new Event("authChanged"));

      navigate("/movies");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <div className="auth-page">
        <div className="auth-card">
          <h1>Welcome Back!</h1>
          <p>Login to your Rio Cinema account</p>

          <form onSubmit={handleLogin}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && (
            <p className="auth-message" role="alert">
              {message}
            </p>
          )}

          <p className="auth-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>

          <p className="auth-link">
            <Link to="/movies">Continue as Guest</Link>
          </p>
        </div>
      </div>
    </>
  );
}
