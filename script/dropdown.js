import leaflet from "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm";
import { debounce } from "./util.js";

const tileLayer = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// TODO: Replace search fn with constituency class that allows getting
//       constituency by id
// TODO: Generalize styling of map (pass in object and create dummy search fn)
// TODO: pass in map HTML element instead of id
// TODO: Only allow selection of single constituency
export class Dropdown {
    constructor(
        { searchInput, suggestionsList, mapElement },
        {
            searchFn,
            getItemById,
            geoJSONPath = "./assets/Geometrie_Wahlkreise_20DBT_geo.geojson",
        },
        styling = { fillColor: "#728ed6", color: "white", fillOpacity: 0.7 }
    ) {
        this.searchInput = searchInput;
        this.suggestionsList = suggestionsList;
        this.mapElement = mapElement;
        this.styling = styling;

        this.geoJSONPath = geoJSONPath;
        this.geoJSONData = undefined;

        this.searchFn = searchFn;
        this.getItemById = getItemById;

        this.activeIdx = -1;
        this.activeItems = [];
        this._selectedItem = null;

        this.setupListeners();

        this.initMap();
    }

    get selectedItem() {
        return this._selectedItem;
    }

    setupListeners() {
        this.searchInput.addEventListener(
            "input",
            debounce(this.runSearch.bind(this), 100, false)
        );
        this.searchInput.addEventListener(
            "keydown",
            this.handleKeydown.bind(this)
        );
        this.searchInput.addEventListener("focus", this.runSearch.bind(this));

        // Close suggestions list when clicking outside
        document.addEventListener("click", (event) => {
            if (
                !this.searchInput.contains(event.target) &&
                !this.suggestionsList.contains(event.target)
            ) {
                this.suggestionsList.innerHTML = "";
                this.activeIdx = -1;
            }
        });
    }

    async initMap() {
        const { fillColor, fillOpacity, color } = this.styling;

        // Create map
        this.map = L.map(this.mapElement).setView([51.4, 9.7], 6); // Germany

        // Add OpenStreetMap tile layer
        L.tileLayer(tileLayer, {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(this.map);

        // Sample GeoJSON data
        const geoJSONDataRaw = await fetch(this.geoJSONPath);
        this.geoJSONData = await geoJSONDataRaw.json();

        // Define style for features
        function styleFeature(feature) {
            return {
                fillColor,
                color,
                weight: 2,
                opacity: 1,
                fillOpacity,
            };
        }

        // Add GeoJSON layer to the map
        this.geojsonLayer = L.geoJSON(this.geoJSONData, {
            style: styleFeature,
            onEachFeature: ((feature, layer) => {
                // Show popup on hover
                layer.on("mouseover", function (e) {
                    layer
                        .bindPopup(
                            `<b>Wahlkreis ${feature.properties.WKR_NR}</b><br>${feature.properties.WKR_NAME}`,
                            { autoPan: false }
                        )
                        .openPopup();
                });
                layer.on("mouseout", function (e) {
                    layer.closePopup();
                });

                // Selection on click (toggle color)
                layer.on(
                    "click",
                    function (e) {
                        this.selectItem(e.target.feature.properties.WKR_NR);
                    }.bind(this)
                );
            }).bind(this),
        }).addTo(this.map);
    }

    selectItem(constituencyId) {
        if (constituencyId) {
            const c = this.getItemById(constituencyId);
            if (!c) {
                console.warn("No item found");
                return;
            }
            this._selectedItem = this.getItemById(constituencyId);
        } else if (!constituencyId && this.activeIdx < 0) {
            return;
        } else {
            const c = this.activeItems[this.activeIdx];
            if (!c) {
                console.warn("No item selected");
                return;
            }
            this._selectedItem = c;
        }

        this.searchInput.value = this._selectedItem.name;
        this.suggestionsList.innerHTML = "";
        // this.activeIdx = -1;
        // this.activeItems = [];

        for (const feature of this.geoJSONData.features) {
            if (feature.properties.WKR_NR === this._selectedItem.number) {
                this.geojsonLayer.eachLayer((layer) => {
                    if (layer.feature === feature) {
                        this.map.fitBounds(layer.getBounds());
                        layer.setStyle({ fillColor: "red" });
                    } else {
                        layer.setStyle({ fillColor: this.styling.fillColor });
                    }
                });
            }
        }
    }

    runSearch(event) {
        const query = this.searchInput.value.toLowerCase();
        this.activeIdx = -1;
        this.suggestionsList.innerHTML = "";

        let searchResult = this.searchFn(query);
        if (!searchResult) return;
        else {
            this.activeItems = searchResult;
        }

        this.renderSuggestions();
    }

    renderSuggestions() {
        this.suggestionsList.innerHTML = "";
        this.activeItems.entries().forEach(([idx, c]) => {
            const li = document.createElement("li");
            li.setAttribute("role", "option");
            li.setAttribute("tabindex", "0");

            li.textContent = c.repr();
            li.addEventListener("click", () => {
                this.activeIdx = idx;
                this.selectItem();
            });
            this.suggestionsList.appendChild(li);
        });
    }

    handleKeydown(event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.activeIdx = Math.min(
                this.activeIdx + 1,
                this.activeItems.length - 1
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            this.activeIdx = Math.max(this.activeIdx - 1, 0);
        } else if (event.key === "Enter") {
            event.preventDefault();
            this.selectItem();
        } else if (event.key === "Escape") {
            this.suggestionsList.innerHTML = "";
            this.activeIdx = -1;
        }

        if (this.activeIdx >= 0) {
            this.suggestionsList
                .querySelectorAll("li")
                .forEach((item, index) => {
                    if (index === this.activeIdx) {
                        item.classList.add("active");
                        item.scrollIntoView({ block: "nearest" });
                    } else {
                        item.classList.remove("active");
                    }
                });
        }
    }

    focus() {
        this.searchInput.focus();
        this.runSearch();
    }

    reset() {
        this.searchInput.value = this._selectedItem
            ? this._selectedItem.name
            : "";
        this.suggestionsList.innerHTML = "";
        this.activeIdx = -1;
        this.activeItems = [];
        this.searchInput.focus();
    }
}
