const HISTORY_KEY = "contractWhistHistory_v3";

const rulesets = [
  {
    title: "Full / Half Core Structure",
    points: [
      "Validate deck size: players x start cards must be 52 or less (and players x end cards for full games).",
      "Full game: start down to 2, include total 2-card rounds equal to player count, then increase to end cards.",
      "Half game: start down to 2, include total 2-card rounds equal to player count, then stop.",
      "Dealer starts at Player 1 and rotates every round.",
      "Player count is between 2 and 8."
    ]
  },
  {
    title: "Bidding and Tricks",
    points: [
      "Bids are submitted in order, starting with the player after dealer.",
      "Final bidder cannot make total bids equal cards dealt.",
      "Undo is available during bidding to step back one bid.",
      "Tricks won must total exactly the cards dealt in that hand."
    ]
  },
  {
    title: "Special Rounds (Appended)",
    points: [
      "Blind: same start-card hand size, normal app behavior for bid and trick entry.",
      "No Trumps: same start-card hand size, bidding as normal, trump is forced to no trumps.",
      "Miz: same start-card hand size, no bidding, trump is no trumps, score is -5 per trick unless a player wins all tricks (then +5 x tricks in round)."
    ]
  },
  {
    title: "Zero-Bid Streak Rule",
    points: [
      "Consecutive zero bids are tracked per player.",
      "After 3 consecutive zero bids, that player cannot bid zero in the next bidding round."
    ]
  }
];

const scoringProfiles = {
  blackout: {
    label: "Blackout",
    calc: (bid, tricks) => (bid === tricks ? 10 + bid : 0)
  },
  "trick-bonus": {
    label: "Contract Whist",
    calc: (bid, tricks) => tricks + (bid === tricks ? 10 : 0)
  },
  "squared-penalty": {
    label: "Nomination",
    calc: (bid, tricks) => {
      if (bid === tricks) {
        return 10 + bid * bid;
      }
      const diff = Math.abs(bid - tricks);
      return -(diff * diff);
    }
  }
};

const trumpLabelsHtml = {
  spades: "Spades &spades;",
  hearts: "Hearts &hearts;",
  diamonds: "Diamonds &diams;",
  clubs: "Clubs &clubs;",
  none: "No Trumps"
};

const state = {
  currentGame: null,
  history: loadHistory(),
  ui: {
    expandedLeaderboard: false
  }
};

const views = Array.from(document.querySelectorAll(".view"));
const playerCountInput = document.getElementById("player-count");
const playerNameFields = document.getElementById("player-name-fields");
const setupForm = document.getElementById("setup-form");
const gameModeSelect = document.getElementById("game-mode");
const endCardsBlock = document.getElementById("end-cards-block");
const endCardsInput = document.getElementById("end-cards");

const roundMeta = document.getElementById("round-meta");
const cardsChip = document.getElementById("cards-chip");
const dealerChip = document.getElementById("dealer-chip");
const leaderChip = document.getElementById("leader-chip");
const trumpChip = document.getElementById("trump-chip");
const differenceChip = document.getElementById("difference-chip");
const phaseTitle = document.getElementById("phase-title");
const phaseInstruction = document.getElementById("phase-instruction");
const phaseError = document.getElementById("phase-error");
const bidForm = document.getElementById("bid-form");
const bidInput = document.getElementById("bid-input");
const undoBidBtn = document.getElementById("undo-bid-btn");
const trickForm = document.getElementById("trick-form");
const trickInput = document.getElementById("trick-input");
const trumpPicker = document.getElementById("trump-picker");
const playerStatusRows = document.getElementById("player-status-rows");
const leaderboard = document.getElementById("leaderboard");
const completePanel = document.getElementById("game-complete");
const winnerLine = document.getElementById("winner-line");
const phaseBox = document.getElementById("phase-box");
const expandBoardBtn = document.getElementById("expand-board-btn");
const closeBoardBtn = document.getElementById("close-board-btn");
const expandedBoard = document.getElementById("expanded-board");
const expandedHead = document.getElementById("expanded-head");
const expandedBody = document.getElementById("expanded-body");

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showPhaseError(message) {
  if (!message) {
    phaseError.textContent = "";
    phaseError.classList.add("hidden");
    return;
  }

  phaseError.textContent = message;
  phaseError.classList.remove("hidden");
}

function clearDifferenceClasses(element) {
  element.classList.remove("diff-good", "diff-bad", "diff-neutral");
}

function getDifferenceClass(difference) {
  if (difference > 0) {
    return "diff-good";
  }
  if (difference < 0) {
    return "diff-bad";
  }
  return "diff-neutral";
}

function getBidDifferenceInfo(round) {
  if (round.specialType === "miz") {
    return null;
  }

  const bidSum = round.bids.reduce((sum, bid) => sum + (bid === null ? 0 : bid), 0);
  return {
    bidSum,
    cardsDealt: round.cardsDealt,
    difference: bidSum - round.cardsDealt
  };
}

function formatDifferenceHtml(round) {
  const info = getBidDifferenceInfo(round);
  if (!info) {
    return "N/A";
  }

  const sign = info.difference > 0 ? "+" : "";
  const cssClass = getDifferenceClass(info.difference);
  return `<span class="${cssClass}">${sign}${info.difference}</span> (${info.bidSum}/${info.cardsDealt})`;
}

function renderDifferenceChip(round) {
  clearDifferenceClasses(differenceChip);

  const info = getBidDifferenceInfo(round);
  if (!info) {
    differenceChip.textContent = "Bid Difference: N/A";
    return;
  }

  const sign = info.difference > 0 ? "+" : "";
  const cssClass = getDifferenceClass(info.difference);
  differenceChip.classList.add(cssClass);
  differenceChip.textContent = `Bid Difference: ${sign}${info.difference} (bids ${info.bidSum}/${info.cardsDealt})`;
}

function formatSpecialType(specialType) {
  if (specialType === "blind") {
    return "Blind";
  }
  if (specialType === "no-trumps") {
    return "No Trumps";
  }
  if (specialType === "miz") {
    return "Miz";
  }
  return "Standard";
}

function switchView(id) {
  views.forEach((view) => view.classList.toggle("active", view.id === id));

  if (id !== "score-view") {
    state.ui.expandedLeaderboard = false;
  }

  if (id === "setup-view") {
    renderNameFields(Number(playerCountInput.value));
    syncSetupByMode();
  }
  if (id === "score-view") {
    renderScoreView();
  }
  if (id === "rules-view") {
    renderRules();
  }
  if (id === "history-view") {
    renderHistory();
  }
}

function renderNameFields(count) {
  const safeCount = Number.isInteger(count) ? count : 4;
  const previous = Array.from(playerNameFields.querySelectorAll("input")).map((input) => input.value.trim());

  playerNameFields.innerHTML = "";

  for (let i = 0; i < safeCount; i += 1) {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.type = "text";
    input.name = `player-${i + 1}`;
    input.required = true;
    input.maxLength = 24;
    input.placeholder = `Player ${i + 1}`;
    input.value = previous[i] || `Player ${i + 1}`;
    wrapper.appendChild(input);
    playerNameFields.appendChild(wrapper);
  }
}

function syncSetupByMode() {
  const isFull = gameModeSelect.value === "full";
  endCardsBlock.classList.toggle("hidden", !isFull);
  endCardsInput.required = isFull;
}

function createRoundPlan(mode, startCards, endCards, playerCount, specialRounds) {
  if (!Number.isInteger(startCards) || startCards < 2 || startCards > 26) {
    throw new Error("Start cards must be between 2 and 26.");
  }

  if (playerCount * startCards > 52) {
    throw new Error("Players x start cards cannot be more than 52 cards.");
  }

  if (mode === "full") {
    if (!Number.isInteger(endCards) || endCards < 2 || endCards > 26) {
      throw new Error("End cards must be between 2 and 26.");
    }
    if (endCards > startCards) {
      throw new Error("End cards cannot be higher than start cards for full games.");
    }
    if (playerCount * endCards > 52) {
      throw new Error("Players x end cards cannot be more than 52 cards.");
    }
  }

  const standardCards = [];
  for (let cards = startCards; cards >= 2; cards -= 1) {
    standardCards.push(cards);
  }

  let twoCardRounds = standardCards.filter((value) => value === 2).length;
  while (twoCardRounds < playerCount) {
    standardCards.push(2);
    twoCardRounds += 1;
  }

  if (mode === "full") {
    for (let cards = 3; cards <= endCards; cards += 1) {
      standardCards.push(cards);
    }
  }

  const plan = standardCards.map((cards) => ({ cardsDealt: cards, specialType: "standard" }));

  for (const special of specialRounds) {
    plan.push({ cardsDealt: startCards, specialType: special });
  }

  return plan;
}

function createRoundState(game) {
  const playerCount = game.players.length;
  const roundConfig = game.roundPlan[game.currentRoundIndex];
  const turnOrder = [];

  for (let i = 1; i <= playerCount; i += 1) {
    turnOrder.push((game.dealerIndex + i) % playerCount);
  }

  const specialType = roundConfig.specialType;
  const isMiz = specialType === "miz";
  const hasForcedNoTrump = specialType === "no-trumps" || specialType === "miz";

  game.round = {
    roundNumber: game.currentRoundIndex + 1,
    cardsDealt: roundConfig.cardsDealt,
    dealerIndex: game.dealerIndex,
    turnOrder,
    phase: isMiz ? "tricks" : "bidding",
    turnPointer: 0,
    bids: new Array(playerCount).fill(null),
    tricks: new Array(playerCount).fill(null),
    points: new Array(playerCount).fill(null),
    trump: hasForcedNoTrump ? "none" : null,
    trumpChooserIndex: null,
    specialType
  };
}

function startGame(event) {
  event.preventDefault();

  const playerCount = Number(playerCountInput.value);
  const gameMode = gameModeSelect.value;
  const startCards = Number(document.getElementById("start-cards").value);
  const endCards = Number(endCardsInput.value);
  const scoringProfile = document.getElementById("scoring-profile").value;
  const specialRounds = Array.from(document.querySelectorAll("input[name='special-round']:checked")).map(
    (input) => input.value
  );
  const names = Array.from(playerNameFields.querySelectorAll("input")).map((input) => input.value.trim());

  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 8) {
    alert("Enter a valid player count between 2 and 8.");
    return;
  }

  if (names.some((name) => !name)) {
    alert("Please enter all player names.");
    return;
  }

  let roundPlan;
  try {
    roundPlan = createRoundPlan(gameMode, startCards, endCards, playerCount, specialRounds);
  } catch (error) {
    alert(error.message);
    return;
  }

  state.currentGame = {
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    startedAt: new Date().toISOString(),
    gameMode,
    startCards,
    endCards: gameMode === "full" ? endCards : null,
    scoringProfile,
    roundPlan,
    currentRoundIndex: 0,
    dealerIndex: 0,
    players: names.map((name) => ({ name, total: 0, zeroStreak: 0 })),
    rounds: [],
    round: null
  };

  createRoundState(state.currentGame);
  state.ui.expandedLeaderboard = false;
  showPhaseError("");
  switchView("score-view");
}

function getCurrentTurnPlayerIndex(round) {
  return round.turnOrder[round.turnPointer];
}

function determineTrumpChooser(round) {
  const highestBid = Math.max(...round.bids);
  for (const playerIndex of round.turnOrder) {
    if (round.bids[playerIndex] === highestBid) {
      return playerIndex;
    }
  }
  return round.turnOrder[0];
}

function isZeroBlocked(game, playerIndex) {
  return game.players[playerIndex].zeroStreak >= 3;
}

function submitBid(event) {
  event.preventDefault();

  const game = state.currentGame;
  if (!game || !game.round || game.round.phase !== "bidding") {
    return;
  }

  const round = game.round;
  const playerIndex = getCurrentTurnPlayerIndex(round);
  const blockedZero = isZeroBlocked(game, playerIndex);
  const minBid = blockedZero ? 1 : 0;
  const value = Number(bidInput.value);

  if (!Number.isInteger(value) || value < minBid || value > round.cardsDealt) {
    const lowerBound = blockedZero ? "1" : "0";
    showPhaseError(`Bid must be a whole number between ${lowerBound} and ${round.cardsDealt}.`);
    return;
  }

  const existingBidTotal = round.bids.reduce((sum, bid) => sum + (bid === null ? 0 : bid), 0);
  const isLastBidder = round.turnPointer === round.turnOrder.length - 1;

  if (isLastBidder && existingBidTotal + value === round.cardsDealt) {
    showPhaseError(
      `Final bid cannot make total bids equal ${round.cardsDealt}. Enter a different bid for ${game.players[playerIndex].name}.`
    );
    return;
  }

  round.bids[playerIndex] = value;
  round.turnPointer += 1;
  bidInput.value = "";
  showPhaseError("");

  if (round.turnPointer >= round.turnOrder.length) {
    if (round.specialType === "no-trumps") {
      round.phase = "tricks";
      round.turnPointer = 0;
      round.trump = "none";
    } else {
      round.phase = "trump";
      round.turnPointer = 0;
      round.trumpChooserIndex = determineTrumpChooser(round);
    }
  }

  renderScoreView();
}

function undoBid() {
  const game = state.currentGame;
  if (!game || !game.round || game.round.phase !== "bidding") {
    return;
  }

  const round = game.round;
  if (round.turnPointer === 0) {
    return;
  }

  round.turnPointer -= 1;
  const playerIndex = round.turnOrder[round.turnPointer];
  round.bids[playerIndex] = null;
  showPhaseError("");
  renderScoreView();
}

function chooseTrump(trumpKey) {
  const game = state.currentGame;
  if (!game || !game.round || game.round.phase !== "trump") {
    return;
  }

  game.round.trump = trumpKey;
  game.round.phase = "tricks";
  game.round.turnPointer = 0;
  showPhaseError("");
  renderScoreView();
}

function submitTricks(event) {
  event.preventDefault();

  const game = state.currentGame;
  if (!game || !game.round || game.round.phase !== "tricks") {
    return;
  }

  const round = game.round;
  const playerIndex = getCurrentTurnPlayerIndex(round);
  const value = Number(trickInput.value);

  if (!Number.isInteger(value) || value < 0 || value > round.cardsDealt) {
    showPhaseError(`Tricks must be a whole number between 0 and ${round.cardsDealt}.`);
    return;
  }

  const existingTricks = round.tricks.reduce((sum, tricks) => sum + (tricks === null ? 0 : tricks), 0);
  const isLastPlayer = round.turnPointer === round.turnOrder.length - 1;

  if (existingTricks + value > round.cardsDealt) {
    showPhaseError(`Total tricks cannot exceed ${round.cardsDealt}.`);
    return;
  }

  if (isLastPlayer && existingTricks + value !== round.cardsDealt) {
    showPhaseError(`Final tricks entry must make total tricks exactly ${round.cardsDealt}.`);
    return;
  }

  round.tricks[playerIndex] = value;
  round.turnPointer += 1;
  trickInput.value = "";
  showPhaseError("");

  if (round.turnPointer >= round.turnOrder.length) {
    finalizeRound(game);
    return;
  }

  renderScoreView();
}

function calculateMizPoints(tricks, cardsDealt) {
  if (tricks === cardsDealt) {
    return 5 * cardsDealt;
  }
  return -5 * tricks;
}

function finalizeRound(game) {
  const round = game.round;
  const profile = scoringProfiles[game.scoringProfile] || scoringProfiles["trick-bonus"];

  for (let i = 0; i < game.players.length; i += 1) {
    let points;

    if (round.specialType === "miz") {
      points = calculateMizPoints(round.tricks[i], round.cardsDealt);
    } else {
      points = profile.calc(round.bids[i], round.tricks[i]);
    }

    round.points[i] = points;
    game.players[i].total += points;

    if (round.bids[i] === 0) {
      game.players[i].zeroStreak += 1;
    } else {
      game.players[i].zeroStreak = 0;
    }
  }

  game.rounds.push({
    roundNumber: round.roundNumber,
    cardsDealt: round.cardsDealt,
    dealerIndex: round.dealerIndex,
    specialType: round.specialType,
    bids: [...round.bids],
    tricks: [...round.tricks],
    points: [...round.points],
    trump: round.trump
  });

  game.currentRoundIndex += 1;
  game.dealerIndex = (game.dealerIndex + 1) % game.players.length;

  if (game.currentRoundIndex >= game.roundPlan.length) {
    finishGame(game);
    renderScoreView();
    return;
  }

  createRoundState(game);
  renderScoreView();
}

function formatTrumpHtml(trumpKey) {
  if (!trumpKey) {
    return "Not selected";
  }
  return trumpLabelsHtml[trumpKey] || escapeHtml(trumpKey);
}

function renderExpandedLeaderboard(game) {
  if (!state.ui.expandedLeaderboard) {
    expandBoardBtn.textContent = "Expand";
    expandedBoard.classList.add("hidden");
    return;
  }

  expandBoardBtn.textContent = "Collapse";
  expandedBoard.classList.remove("hidden");

  const headColumns = ["Round", "Trump", "Difference", ...game.players.map((player) => escapeHtml(player.name))]
    .map((label) => `<th>${label}</th>`)
    .join("");
  expandedHead.innerHTML = `<tr>${headColumns}</tr>`;

  expandedBody.innerHTML = game.rounds
    .map((round) => {
      const roundLabel = `${round.roundNumber} (${round.cardsDealt} cards, ${formatSpecialType(round.specialType)})`;

      const cells = game.players
        .map((player, playerIndex) => {
          if (round.specialType === "miz") {
            return `<td>Miz: ${round.tricks[playerIndex]} tricks = ${round.points[playerIndex]} pts</td>`;
          }

          const bid = round.bids[playerIndex];
          const tricks = round.tricks[playerIndex];
          const points = round.points[playerIndex];
          const bidSuccess = bid !== null && bid === tricks;
          const bidHtml = bidSuccess ? `<span class="bid-success">${bid}</span>` : String(bid);
          return `<td>${bidHtml}/${tricks} = ${points}</td>`;
        })
        .join("");

      return `<tr><td>${roundLabel}</td><td>${formatTrumpHtml(round.trump)}</td><td>${formatDifferenceHtml(round)}</td>${cells}</tr>`;
    })
    .join("");
}

function renderScoreView() {
  const game = state.currentGame;
  if (!game) {
    return;
  }

  const isComplete = game.currentRoundIndex >= game.roundPlan.length;
  const profileLabel = scoringProfiles[game.scoringProfile]?.label || "Custom";

  roundMeta.textContent = isComplete
    ? `Finished ${game.roundPlan.length} rounds (${profileLabel} scoring)`
    : `Round ${game.currentRoundIndex + 1} of ${game.roundPlan.length} (${profileLabel} scoring)`;

  if (isComplete) {
    phaseBox.classList.add("hidden");
    cardsChip.textContent = "Cards: complete";
    dealerChip.textContent = "Dealer: complete";
    leaderChip.textContent = "Lead: complete";
    trumpChip.textContent = "Trump: complete";
    clearDifferenceClasses(differenceChip);
    differenceChip.textContent = "Bid Difference: complete";

    const ranking = [...game.players].sort((a, b) => b.total - a.total);
    playerStatusRows.innerHTML = game.players
      .map(
        (player) =>
          `<tr><td>${escapeHtml(player.name)}</td><td>-</td><td>-</td><td>-</td><td>${player.total}</td><td>${player.zeroStreak}</td></tr>`
      )
      .join("");
    leaderboard.innerHTML = ranking
      .map((player) => `<li>${escapeHtml(player.name)} - ${player.total} pts</li>`)
      .join("");

    renderExpandedLeaderboard(game);

    completePanel.classList.remove("hidden");
    const topScore = ranking[0].total;
    const winners = ranking.filter((player) => player.total === topScore).map((player) => player.name);
    winnerLine.textContent =
      winners.length === 1
        ? `${winners[0]} wins with ${topScore} points.`
        : `Tie: ${winners.join(", ")} with ${topScore} points each.`;
    return;
  }

  completePanel.classList.add("hidden");
  phaseBox.classList.remove("hidden");

  const round = game.round;
  const dealerName = game.players[round.dealerIndex].name;
  const leadPlayerName = game.players[round.turnOrder[0]].name;
  const specialLabel = formatSpecialType(round.specialType);
  const activeTurnPlayerIndex =
    round.phase === "bidding" || round.phase === "tricks" ? getCurrentTurnPlayerIndex(round) : round.trumpChooserIndex;

  cardsChip.textContent = `Cards this hand: ${round.cardsDealt} (${specialLabel})`;
  dealerChip.textContent = `Dealer: ${dealerName}`;
  leaderChip.textContent = `Lead (first to bid): ${leadPlayerName}`;
  trumpChip.innerHTML = `Trump: ${formatTrumpHtml(round.trump)}`;
  renderDifferenceChip(round);

  if (round.phase === "bidding") {
    const playerName = game.players[activeTurnPlayerIndex].name;
    const blockedZero = isZeroBlocked(game, activeTurnPlayerIndex);
    phaseTitle.textContent = "Bidding";
    phaseInstruction.textContent = blockedZero
      ? `${playerName} to bid. They already have 3 consecutive zero bids, so 0 is not allowed this round.`
      : `${playerName} to bid. Final bidder cannot make total bids equal ${round.cardsDealt}.`;
    bidForm.classList.remove("hidden");
    trumpPicker.classList.add("hidden");
    trickForm.classList.add("hidden");
    bidInput.max = String(round.cardsDealt);
    bidInput.min = blockedZero ? "1" : "0";
    undoBidBtn.disabled = round.turnPointer === 0;
  } else if (round.phase === "trump") {
    const chooser = game.players[round.trumpChooserIndex].name;
    phaseTitle.textContent = "Choose Trumps";
    phaseInstruction.textContent = `${chooser} had the highest bid and must choose trumps.`;
    bidForm.classList.add("hidden");
    trumpPicker.classList.remove("hidden");
    trickForm.classList.add("hidden");
  } else {
    const playerName = game.players[activeTurnPlayerIndex].name;
    phaseTitle.textContent = round.specialType === "miz" ? "Miz: Tricks Won" : "Tricks Won";
    phaseInstruction.textContent =
      round.specialType === "miz"
        ? `${playerName} to submit tricks won. Tricks must total ${round.cardsDealt}. Miz score is -5 per trick unless all tricks are won.`
        : `${playerName} to submit tricks won. Tricks must total ${round.cardsDealt}.`;
    bidForm.classList.add("hidden");
    trumpPicker.classList.add("hidden");
    trickForm.classList.remove("hidden");
    trickInput.max = String(round.cardsDealt);
  }

  playerStatusRows.innerHTML = game.players
    .map((player, index) => {
      const bid = round.specialType === "miz" ? "Miz" : round.bids[index] === null ? "-" : round.bids[index];
      const tricks = round.tricks[index] === null ? "-" : round.tricks[index];
      const roundPoints = round.points[index] === null ? "-" : round.points[index];
      const isDealer = index === round.dealerIndex;
      const isActive = index === activeTurnPlayerIndex;
      const rowClass = `${isDealer ? "dealer-row " : ""}${isActive ? "active-row" : ""}`.trim();
      const dealerBadge = isDealer ? '<span class="table-badge">Dealer</span>' : "";

      return `
        <tr class="${rowClass}">
          <td>${escapeHtml(player.name)} ${dealerBadge}</td>
          <td>${bid}</td>
          <td>${tricks}</td>
          <td>${roundPoints}</td>
          <td>${player.total}</td>
          <td>${player.zeroStreak}</td>
        </tr>`;
    })
    .join("");

  const ranking = [...game.players].sort((a, b) => b.total - a.total);
  leaderboard.innerHTML = ranking
    .map((player) => `<li>${escapeHtml(player.name)} - ${player.total} pts</li>`)
    .join("");

  renderExpandedLeaderboard(game);
}

function finishGame(game) {
  game.finishedAt = new Date().toISOString();

  const summary = {
    id: game.id,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
    gameMode: game.gameMode,
    startCards: game.startCards,
    endCards: game.endCards,
    scoringProfile: game.scoringProfile,
    roundPlan: [...game.roundPlan],
    players: game.players.map((player) => ({ name: player.name, total: player.total }))
  };

  state.history.unshift(summary);
  state.history = state.history.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

function renderRules() {
  const rulesList = document.getElementById("rules-list");
  rulesList.innerHTML = rulesets
    .map((rule) => {
      const list = rule.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
      return `
        <article class="rule-card">
          <h3>${escapeHtml(rule.title)}</h3>
          <ul>${list}</ul>
        </article>`;
    })
    .join("");
}

function renderHistory() {
  const historyList = document.getElementById("history-list");

  if (!state.history.length) {
    historyList.innerHTML = '<div class="empty">No recent games yet.</div>';
    return;
  }

  historyList.innerHTML = state.history
    .map((game) => {
      const date = new Date(game.finishedAt || game.startedAt).toLocaleString();
      const ranking = [...game.players].sort((a, b) => b.total - a.total);
      const scores = ranking.map((player) => `<li>${escapeHtml(player.name)} - ${player.total} pts</li>`).join("");
      const profileLabel = scoringProfiles[game.scoringProfile]?.label || game.scoringProfile;
      const modeLabel = game.gameMode === "full" ? "Full" : "Half";
      const endLabel = game.endCards === null ? "-" : game.endCards;

      const specialRounds = game.roundPlan.filter((round) => round.specialType !== "standard").length;

      return `
        <article class="history-card">
          <h3>${date}</h3>
          <p>${modeLabel} game | Start ${game.startCards}, End ${endLabel}, ${game.roundPlan.length} rounds, ${specialRounds} special (${escapeHtml(
            profileLabel
          )})</p>
          <ul>${scores}</ul>
        </article>`;
    })
    .join("");
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-view");
    if (target === "score-view" && !state.currentGame) {
      return;
    }
    switchView(target);
  });
});

playerCountInput.addEventListener("input", () => {
  renderNameFields(Number(playerCountInput.value));
});

gameModeSelect.addEventListener("change", syncSetupByMode);
setupForm.addEventListener("submit", startGame);
bidForm.addEventListener("submit", submitBid);
trickForm.addEventListener("submit", submitTricks);
undoBidBtn.addEventListener("click", undoBid);

trumpPicker.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-trump]");
  if (!target) {
    return;
  }
  chooseTrump(target.getAttribute("data-trump"));
});

expandBoardBtn.addEventListener("click", () => {
  state.ui.expandedLeaderboard = !state.ui.expandedLeaderboard;
  renderScoreView();
});

closeBoardBtn.addEventListener("click", () => {
  state.ui.expandedLeaderboard = false;
  renderScoreView();
});

renderNameFields(Number(playerCountInput.value));
syncSetupByMode();
renderHistory();
renderRules();
