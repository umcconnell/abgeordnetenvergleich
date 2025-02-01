import {
  Politician,
  Poll,
  Vote,
  Constituency,
  fetchConstituencies,
  fetchPoliticiansByDistrict,
  fetchVotesByMandate,
} from "./api.js";

let myConstituency = undefined;
let constituencies = undefined;

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const searchBtn = document.getElementById("searchButton");
const backBtn = document.getElementById("backButton");

const votesTable = document.getElementById("votesTable");
const tableHead = votesTable.querySelector("thead");
const tableBody = votesTable.querySelector("tbody");
const loader = document.getElementById("loader");

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

function runSearch() {
  const query = searchInput.value.toLowerCase();
  suggestionsList.innerHTML = "";

  if (query.length <= 2) return;
  else if (!constituencies) return;

  const filtered = constituencies
    .map((c) => [c.matchScore(query), c])
    .sort((a, b) => a[0] - b[0])
    .map((a) => a[1])
    .slice(0, 10);

  filtered.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `${c.name} (${c.number})`;
    li.addEventListener("click", () => {
      myConstituency = c;
      searchInput.value = c.name;
      suggestionsList.innerHTML = "";
    });
    suggestionsList.appendChild(li);
  });
}

function setup() {
  const debouncedSearch = debounce(runSearch, 100, false);
  searchInput.addEventListener("input", debouncedSearch);
  searchInput.addEventListener("focus", debouncedSearch);

  searchBtn.addEventListener("click", () => {
    if (!myConstituency) {
      searchInput.focus();
      return;
    }
    step1.setAttribute("hidden", "");
    step2.removeAttribute("hidden");
    document.getElementById("constituencyName").textContent =
      myConstituency.name;
    document.getElementById("constituencyNumber").textContent =
      myConstituency.number;
    displayVotingRecords();
  });

  backBtn.addEventListener("click", () => {
    step2.setAttribute("hidden", "");
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";
    searchInput.value = myConstituency.name;
    step1.removeAttribute("hidden");
  });
}

async function displayVotingRecords() {
  loader.removeAttribute("hidden");
  votesTable.setAttribute("hidden", "");

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const mandates = await fetchPoliticiansByDistrict(myConstituency.id);
  const politicians = new Map(mandates.map((p) => [p.mandateId, p]));

  const sortedMandateIds = politicians
    .values()
    .toArray()
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    })
    .map((p) => p.mandateId);

  tableHead.innerHTML = `
        <tr>
            <th>Abstimmung</th>
            ${sortedMandateIds
              .map((mid) => {
                let politician = politicians.get(mid);
                return `<th>${politician.name}<br/>(${politician.fraction})</th>`;
              })
              .join("")}
            <th>Abgeordnetenwatch</th>
        </tr>
    `;

  const allVotes = new Map();

  for (const mandate of mandates) {
    const votes = await fetchVotesByMandate(mandate.mandateId);
    for (const vote of votes) {
      const pollId = vote.poll.id;
      if (!allVotes.has(pollId)) {
        let poll = new Poll(vote);
        allVotes.set(pollId, poll);
      }

      let voteObj = new Vote(vote);
      allVotes.get(pollId).votes.push(voteObj);
    }
  }

  for (const [pollId, poll] of allVotes.entries()) {
    let row = document.createElement("tr");
    row.innerHTML = `<td>${poll.name}</td>`;

    for (const mid of sortedMandateIds) {
      const vote = poll.votes.find((v) => v.mandateId === mid);
      let symbol = "N/A";
      if (vote) {
        const voteStatus = vote.vote;
        if (voteStatus == "yes") {
          symbol = "✅";
        } else if (voteStatus == "no") {
          symbol = "❌";
        } else if (voteStatus == "abstain") {
          symbol = "🤷";
        } else if (voteStatus == "no_show") {
          symbol = "➖";
        }
      }
      row.innerHTML += `<td>${symbol}</td>`;
    }
    row.innerHTML += `<td><a href="${poll.url}" target="_blank" rel="noopener noreferrer">Link</a></td>`;

    tableBody.appendChild(row);
  }

  loader.setAttribute("hidden", "");
  votesTable.removeAttribute("hidden");
}

setup();

(async () => {
  constituencies = await fetchConstituencies();
})();
