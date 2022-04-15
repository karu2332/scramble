let scores = {};

function scoreAddPlayer(player) {
    if (!scores[player]) {
        scores[player] = [];
    }
}

function scorePlayers() {
    return Object.keys(scores);
}

function scoreAddRound(player, round, score) {
    scores[player][round] = score;
}

function scoreGetRound(player, round) {
    return scores[player][round];
}

function scoreGetTotal(player) {
    let total = 0;
    scores[player].forEach((score) => {
        total += score;
    });
    return total;
}

function scoreTbody(round) {
    let tbodyList = [];
    let maxRound = 0;
    let maxTotal = 0;
    for (const player of scorePlayers()) {
        const playerRound = scoreGetRound(player, round);
        if (playerRound > maxRound) {
            maxRound = playerRound;
        }
        const playerTotal = scoreGetTotal(player);
        if (playerTotal > maxTotal) {
            maxTotal = playerTotal;
        }
        tbodyList.push({
            'name': player,
            'round': playerRound,
            'total': playerTotal,
        });
    }
    tbodyList.sort((a, b) => {
        return b.total - a.total;
    });

    let html = '';
    for (const line of tbodyList) {
        html += '<tr>';
        html += `<td>${line.name}</td>`;
        if (line.round === maxRound) {
            html += `<td><mark>${line.round}</mark></td>`;
        } else {
            html += `<td>${line.round}</td>`;
        }
        if (line.total === maxTotal) {
            html += `<td><mark>${line.total}</mark></td>`;
        } else {
            html += `<td>${line.total}</td>`;
        }
        html += '</tr>';
    }

    return html;
}

scoreAddPlayer('moose');
scoreAddPlayer('cow');
scoreAddPlayer('dog');
scoreAddPlayer('cat');
scoreAddRound('moose', 1, 123);
scoreAddRound('dog', 1, 234);
scoreAddRound('cat', 1, 345);
scoreAddRound('moose', 2, 22);
scoreAddRound('cow', 2, 33);
scoreAddRound('dog', 2, 44);
scoreAddRound('cat', 2, 11);

console.table(scores);

console.log(`players: ${scorePlayers()}`);

for (const player of scorePlayers()) {
    console.table(`${player} total: ${scoreGetTotal(player)}`);
}

console.log(scoreTbody(2));
