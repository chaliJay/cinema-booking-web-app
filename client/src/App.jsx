
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Movies from "./pages/Movies.jsx";
import SeatReservation from "./seat/SeatReservation.jsx";
import Success from "./pages/Success.jsx";
import Cancel from "./pages/Cancel.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ShowuSelect from "./pages/ShowSelect.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/movies" element={<Movies />} />
      <Route path="/seats" element={<SeatReservation />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
      <Route path="/account" element={<Account />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/showtimes" element={<ShowuSelect />} />
    </Routes>
  );
}
