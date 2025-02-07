import {
    Politician,
    Poll,
    Vote,
    Constituency,
    getConstituencyById,
    fetchPoliticiansByDistrict,
    fetchAllVotes,
} from "./api.js";

let myConstituency = undefined;

const constituencyName = document.getElementById("constituencyName");
const constituencyNumber = document.getElementById("constituencyNumber");
const mpsList = document.getElementById("mpsList");
const votesTable = document.getElementById("votesTable");
const tableHead = votesTable.querySelector("thead");
const tableBody = votesTable.querySelector("tbody");
const loader = document.getElementById("loader");
const errorField = document.getElementById("errorField");
const info = document.getElementById("info");

function displayConstituency() {
    constituencyName.textContent = myConstituency.name;
    constituencyNumber.textContent = myConstituency.number;
}

function displayError(e) {
    errorField.textContent = e.message;
    errorField.removeAttribute("hidden");
    loader.setAttribute("hidden", true);
    votesTable.setAttribute("hidden", true);
    info.setAttribute("hidden", true);
}

async function displayVotingRecords() {
    loader.removeAttribute("hidden");
    votesTable.setAttribute("hidden", "");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    let mandates;
    try {
        mandates = await fetchPoliticiansByDistrict(myConstituency.id);
    } catch (e) {
        displayError(e);
        return;
    }
    const politicians = new Map(mandates.map((p) => [p.mandateId, p]));

    const sortedMandateIds = politicians
        .values()
        .toArray()
        .sort((a, b) => {
            return a.name.localeCompare(b.name);
        })
        .map((p) => p.mandateId);

    for (const mandateId of sortedMandateIds) {
        let politician = politicians.get(mandateId);
        let li = document.createElement("li");
        li.innerHTML = `<a href="${
            politician.url
        }" target="_blank" rel="noopener noreferrer">${politician.name}</a> (${
            politician.fraction
        }) [${politician.mandate_won == "list" ? "Liste" : "Direktmandat"}]`;
        mpsList.appendChild(li);
    }

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
    let votes;
    try {
        votes = await fetchAllVotes(mandates.map((m) => m.mandateId));
    } catch (e) {
        displayError(e);
        return;
    }

    for (const vote of votes) {
        const pollId = vote.poll.id;
        if (!allVotes.has(pollId)) {
            let poll = new Poll(vote);
            allVotes.set(pollId, poll);
        }

        let voteObj = new Vote(vote);
        allVotes.get(pollId).votes.push(voteObj);
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

async function loadConstituency() {
    const urlParams = new URLSearchParams(window.location.search);
    const constituencyId = urlParams.get("constituency");
    if (constituencyId) {
        try {
            myConstituency = await getConstituencyById(constituencyId);
        } catch (e) {
            displayError(e);
            return;
        }

        if (myConstituency) {
            displayConstituency();
            await displayVotingRecords();
        } else {
            displayError(new Error("No constituency found"));
            return;
        }
    } else {
        displayError(new Error("No constituency parameter in URL"));
        return;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadConstituency();
});
