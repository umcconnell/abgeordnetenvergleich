import { Constituency, fetchConstituencies } from "./api.js";
import { Dropdown } from "./dropdown.js";

let constituencies = undefined;
let currentParliamentPeriod = 161; // Default to 21. Bundestag

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const mapElement = document.getElementById("map");
const searchError = document.getElementById("searchError");
const legislatureSelect = document.getElementById("legislatureSelect");
const mapWarning = document.getElementById("mapWarning");

const searchFn = (qry) => {
    if (!constituencies) return undefined;
    else if (qry === "") return undefined;

    let needle = qry.toLowerCase().replace(/\s/g, "");
    if (needle.startsWith("wahlkreis")) {
        needle = needle.slice(9);
        needle = needle.toLowerCase().replace(/\s/g, "");
    }

    // Check if needle starts with number
    let number_match = needle.match(/^\d+/);
    if (number_match) {
        needle = number_match[0];
    }

    return constituencies
        .map((c) => [c.matchScore(needle), c])
        .sort((a, b) => a[0] - b[0])
        .filter((a) => a[0] < 0.6)
        .map((a) => a[1]);
};
const getItemById = (num) => {
    if (!constituencies) return undefined;
    return constituencies.find((c) => c.number === num);
};

const search = new Dropdown(
    { searchInput, suggestionsList, mapElement, errorField: searchError },
    { searchFn, getItemById }
);

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const myConstituency = search.selectedItem;

    // TODO: Validation
    if (
        searchInput.value === "" ||
        (!myConstituency && searchInput.value === "")
    ) {
        search.setErrMsg("Bitte geben Sie einen Wahlkreis ein.");
        search.focus();
        return;
    } else if (!myConstituency || myConstituency.name !== searchInput.value) {
        search.setErrMsg("Bitte wählen Sie einen Wahlkreis aus der Liste.");
        search.focus();
        return;
    }

    window.location.href = `constituency.html?constituency=${myConstituency.id}&period=${currentParliamentPeriod}`;
});

async function loadData() {
    searchInput.disabled = true;
    searchInput.placeholder = "Lade Daten...";

    try {
        constituencies = await fetchConstituencies(currentParliamentPeriod);
    } catch (error) {
        console.error("Failed to load constituencies:", error);
        search.setErrMsg("Fehler beim Laden der Daten.");
    } finally {
        searchInput.disabled = false;
        searchInput.placeholder = "Wahlkreissuche";
        searchInput.focus();
    }
}

legislatureSelect.addEventListener("change", async (e) => {
    currentParliamentPeriod = parseInt(e.target.value);

    // Show/Hide warning
    if (currentParliamentPeriod === 161) {
        mapWarning.removeAttribute("hidden");
    } else {
        mapWarning.setAttribute("hidden", true);
    }

    // Clear current selection
    search.reset();

    // Reload data
    await loadData();
});

(async () => {
    // Initial check for warning
    if (legislatureSelect.value == "161") {
        mapWarning.removeAttribute("hidden");
    }
    currentParliamentPeriod = parseInt(legislatureSelect.value);
    await loadData();
})();
