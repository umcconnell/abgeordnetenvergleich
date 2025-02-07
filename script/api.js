const apiBaseUrl = "https://www.abgeordnetenwatch.de/api/v2";

export class Politician {
    constructor(mandate) {
        this.mandateId = mandate.id;
        this.name = mandate.politician.label;
        this.fraction = mandate.fraction_membership[0].label;
        this.url = mandate.politician.abgeordnetenwatch_url;
        this.mandate_won = mandate.electoral_data.mandate_won;
    }
}

export class Poll {
    constructor(vote) {
        this.pollId = vote.poll.id;
        this.name = vote.poll.label;
        this.votes = [];
        this.url = vote.poll.abgeordnetenwatch_url;
    }
}

export class Vote {
    constructor(vote) {
        this.mandateId = vote.mandate.id;
        this.vote = vote.vote;
    }
}

export class Constituency {
    constructor(constituency) {
        this.id = constituency.id;
        this.name = constituency.name;
        this.number = constituency.number;
    }

    repr() {
        return `${this.name} (${this.number})`;
    }

    matchScore(needle) {
        let haystack = this.name.toLowerCase();

        if (String(this.number) == needle) return 0.0;
        else if (haystack.includes(needle)) return 0.0;

        // Levenshtein distance
        const len1 = haystack.length;
        const len2 = needle.length;

        let matrix = Array(len1 + 1);
        for (let i = 0; i <= len1; i++) {
            matrix[i] = Array(len2 + 1);
        }

        for (let i = 0; i <= len1; i++) {
            matrix[i][0] = i;
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (needle[i - 1] === haystack[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + 1
                    );
                }
            }
        }

        const distance = matrix[len1][len2];
        return distance / Math.max(len1, len2);
    }
}

async function checkResponse(response) {
    if (!response.ok || (response.status >= 400 && response.status < 600)) {
        const data = await response.json();

        if (data && data.meta && data.meta.status_message) {
            throw new Error(data.meta.status_message);
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }
}

export async function fetchConstituencies() {
    const response = await fetch(
        `${apiBaseUrl}/constituencies?parliament_period=132&range_end=1000`
    );
    await checkResponse(response);

    const data = await response.json();
    return data.data.map((c) => new Constituency(c));
}

export async function fetchPoliticiansByDistrict(districtId) {
    const response = await fetch(
        `${apiBaseUrl}/candidacies-mandates?parliament_period=132&type=mandate&electoral_data[entity.constituency]=${districtId}`
    );
    await checkResponse(response);

    const data = await response.json();
    return data.data.map((p) => new Politician(p));
}

/* export async function fetchVotesByMandate(mandateId) {
    // set range_end to max to get all votes
    const response = await fetch(
        `${apiBaseUrl}/votes?mandate=${mandateId}&range_end=1000`
    );
    const data = await response.json();
    return data.data;
} */

export async function fetchAllVotes(mandateIds) {
    // TODO: Handle case where range is not sufficient
    //       Need to check metadata and loop until all votes are fetched
    let range_start = 0;
    const response = await fetch(
        `${apiBaseUrl}/votes?mandate[in]=[${mandateIds.join(
            ","
        )}]&range_end=1000`
    );
    await checkResponse(response);

    let data = await response.json();
    range_start = data.meta.range_end + 1;
    let votes = data.data;

    while (data.meta.total > data.meta.limit) {
        console.warn("Need to fetch more votes");

        const response_extended = await fetch(
            `${apiBaseUrl}/votes?mandate[in]=[${mandateIds.join(
                ","
            )}]&range_start=${range_start}&range_end=${range_start + 1000}`
        );
        await checkResponse(response_extended);

        data = await response_extended.json();
        votes = votes.concat(data.data);
        range_start = data.meta.range_end + 1;
    }

    return votes;
}

export async function getConstituencyById(id) {
    const response = await fetch(`${apiBaseUrl}/constituencies/${id}`);
    await checkResponse(response);

    const data = await response.json();
    return new Constituency(data.data);
}

/* async function fetchPollTitle(pollId) {
  const response = await fetch(`${apiBaseUrl}/polls/${pollId}`);
  const data = await response.json();
  return data.data.attributes.title;
} */
