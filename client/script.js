
// Get search input
const searchInput = document.getElementById("searchInput");

// Get genre dropdown
const genreFilter = document.getElementById("genreFilter");

// Get all movie cards
const movieCards = document.querySelectorAll(".movie-card");

// Search and filter function
function filterMovies() {

    const searchValue = searchInput.value.toLowerCase();

    const selectedGenre = genreFilter.value;

    movieCards.forEach(function(card) {

        const movieName = card.querySelector("h3").textContent.toLowerCase();

        const movieGenres = card.dataset.genre;

        const matchesSearch = movieName.includes(searchValue);

        const matchesGenre =
            selectedGenre === "all" ||
            movieGenres.includes(selectedGenre);

        if (matchesSearch && matchesGenre) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }

    });

}

// Listen for search changes
searchInput.addEventListener("input", filterMovies);

// Listen for genre changes
genreFilter.addEventListener("change", filterMovies);

// Reset filters
function resetFilters() {

    searchInput.value = "";

    genreFilter.value = "all";

    filterMovies();

}
