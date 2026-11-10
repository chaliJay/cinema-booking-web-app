
// ======================================
// CINEBOOK - SEARCH AND GENRE FILTER
// ======================================

const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const movieCards = document.querySelectorAll(".movie-card");

function filterMovies() {
    const searchValue = searchInput.value.toLowerCase();
    const selectedGenre = genreFilter.value;

    movieCards.forEach(card => {
        const movieName = card.querySelector("h3").textContent.toLowerCase();
        const movieGenres = card.dataset.genre;

        const matchesSearch = movieName.includes(searchValue);

        const matchesGenre =
            selectedGenre === "all" ||
            movieGenres.includes(selectedGenre);

        card.style.display =
            matchesSearch && matchesGenre ? "block" : "none";
    });
}

searchInput.addEventListener("input", filterMovies);
genreFilter.addEventListener("change", filterMovies);

document.getElementById("resetBtn").addEventListener("click", () => {
    searchInput.value = "";
    genreFilter.value = "all";
    filterMovies();
});


// ======================================
// CINEBOOK - BOOKING SYSTEM
// ======================================

const bookingModal = document.getElementById("bookingModal");
const selectedMovie = document.getElementById("selectedMovie");
const ticketQuantity = document.getElementById("ticketQuantity");
const totalPrice = document.getElementById("totalPrice");
const payNowBtn = document.getElementById("payNowBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const bookingMessage = document.getElementById("bookingMessage");

const ticketPrice = 12;
let currentMovieId = null;

// Open booking modal
document.querySelectorAll(".book-btn").forEach(button => {
    button.addEventListener("click", () => {

        currentMovieId = button.dataset.movieId;

        const movieName = button
            .closest(".movie-card")
            .querySelector("h3")
            .textContent;

        selectedMovie.textContent = movieName;

        ticketQuantity.value = 1;

        bookingMessage.textContent = "";

        updateTotalPrice();

        bookingModal.style.display = "flex";
    });
});


// Calculate total price
function updateTotalPrice() {

    const quantity = Number(ticketQuantity.value);

    if (quantity >= 1 && quantity <= 10) {
        const total = quantity * ticketPrice;

        totalPrice.textContent =
            `Total: €${total.toFixed(2)}`;
    } else {
        totalPrice.textContent = "Select 1 to 10 tickets";
    }
}

ticketQuantity.addEventListener("input", updateTotalPrice);


// Close modal
closeModalBtn.addEventListener("click", () => {
    bookingModal.style.display = "none";
});


// ======================================
// CINEBOOK - STRIPE PAYMENT
// ======================================

payNowBtn.addEventListener("click", async () => {

    const quantity = Number(ticketQuantity.value);

    if (!currentMovieId) {
        bookingMessage.textContent = "Please select a movie.";
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        bookingMessage.textContent =
            "Please select between 1 and 10 tickets.";
        return;
    }

    payNowBtn.disabled = true;
    payNowBtn.textContent = "Connecting to Stripe...";
    bookingMessage.textContent = "";

    try {

        const response = await fetch(
            "http://localhost:5000/api/create-checkout-session",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    movieId: currentMovieId,
                    quantity: quantity
                })
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

        bookingMessage.textContent =
            error.message || "Unable to connect to payment server.";

        payNowBtn.disabled = false;
        payNowBtn.textContent = "Proceed to Payment";
    }
});
