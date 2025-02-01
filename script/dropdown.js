function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

export class Dropdown {
  constructor(searchInput, suggestionsList, searchFn) {
    this.searchInput = searchInput;
    this.suggestionsList = suggestionsList;
    this.searchFn = searchFn;

    this.activeIdx = -1;
    this.activeItems = [];
    this.selectedItem = null;

    this.searchInput.addEventListener(
      "input",
      debounce(this.runSearch.bind(this), 100, false),
    );
    // this.searchInput.addEventListener("focus", this.runSearch.bind(this));
    this.searchInput.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  selectItem() {
    if (this.activeIdx < 0) return;
    const c = this.activeItems[this.activeIdx];
    this.selectedItem = c;

    this.searchInput.value = c.name;
    this.suggestionsList.innerHTML = "";
    this.activeIdx = -1;
    this.activeItems = [];
  }

  runSearch(event) {
    const query = this.searchInput.value.toLowerCase();
    this.activeIdx = -1;
    this.suggestionsList.innerHTML = "";

    if (query.length <= 2) return;

    let searchResult = this.searchFn(query);
    if (!searchResult) return;
    else {
      this.activeItems = searchResult;
    }

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
        this.activeItems.length - 1,
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
      this.suggestionsList.querySelectorAll("li").forEach((item, index) => {
        if (index === this.activeIdx) {
          item.classList.add("active");
          item.focus();
          this.searchInput.focus();
        } else {
          item.classList.remove("active");
        }
      });
    }
  }

  focus() {
    this.searchInput.focus();
  }

  reset() {
    this.searchInput.value = this.selectedItem ? this.selectedItem.name : "";
    this.suggestionsList.innerHTML = "";
    this.activeIdx = -1;
    this.activeItems = [];
    this.searchInput.focus();
  }
}
