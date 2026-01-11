import { Constituency, fetchConstituencies } from "./api.js";
import { Dropdown } from "./dropdown.js";

let constituencies = undefined;

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const mapElement = document.getElementById("map");
const searchError = document.getElementById("searchError");
const periodSelect = document.getElementById("periodSelect");

const periods = {
    132: {
        id: 132,
        label: "2021-2025",
        geoJSON: "./assets/Geometrie_Wahlkreise_20DBT_geo.geojson",
    },
    161: {
        id: 161,
        label: "2025-2029",
        geoJSON: "./assets/Geometrie_Wahlkreise_21DBT_geo.geojson",
    },
};

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
    {
        searchFn,
        getItemById,
        geoJSONPath: periods[161].geoJSON, // Default to 21st Bundestag
    }
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

    window.location.href = `constituency.html?constituency=${myConstituency.id}&period=${periodSelect.value}`;
});

async function updatePeriod() {
    const periodId = parseInt(periodSelect.value);
    const period = periods[periodId];

    // Update title
    document.querySelector(
        "h1"
    ).textContent = `Abgeordnetenvergleich (Legislatur ${period.label})`;

    // Fetch constituencies for new period
    constituencies = await fetchConstituencies(periodId);

    // Update map
    await search.loadGeoJSON(period.geoJSON);
    search.reset();
}

periodSelect.addEventListener("change", updatePeriod);

(async () => {
    constituencies = await fetchConstituencies(161);
})();
