// Generates the self-contained "Monopoly bot-authoring brief" — the single block
// of text you hand to someone with NO repo access so they can write a bot.
//
// Why a generator and not a checked-in file: the brief must NOT duplicate the
// engine's source. Instead it is ASSEMBLED on demand from the real files
// (types.ts, data.ts, decision.ts, and the read-side helpers in logic/
// development/engine), so it can never drift. Run it to print the brief to
// stdout; the `/monopoly-bot-brief` command pipes that to the clipboard.
//
//   node src/projects/monopoly/bots/bot-brief-cli.mjs            # print
//   npm run bot-brief                                            # print
//
// The boilerplate prose (the charter, how-to, skeleton, rules appendix) lives
// here as string constants — it exists nowhere else, so it is not duplication.
// Everything that IS real source — every type, the board, every constant, the
// helper signatures — is extracted from the live files below.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const MONO = join(HERE, ".."); // src/projects/monopoly

function load(path) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- `path` is this script's own directory joined with hardcoded engine filenames (see SRC below); there is no external/user input, so the path-injection this rule guards against cannot occur.
  const text = readFileSync(path, "utf8");
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  return { text, sf };
}

const SRC = {
  types: load(join(MONO, "types.ts")),
  data: load(join(MONO, "data.ts")),
  logic: load(join(MONO, "logic.ts")),
  development: load(join(MONO, "development.ts")),
  engine: load(join(MONO, "engine.ts")),
  decision: load(join(HERE, "decision.ts")),
};

// ── Source extraction ────────────────────────────────────────────────────────

function nameOf(node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node)
  ) {
    return node.name?.text;
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    return decl !== undefined && ts.isIdentifier(decl.name) ? decl.name.text : undefined;
  }
  return undefined;
}

function find({ sf }, name) {
  for (const st of sf.statements) {
    if (nameOf(st) === name) return st;
  }
  throw new Error(`export not found: ${name}`);
}

function jsdoc(node, text) {
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    if (text.slice(r.pos, r.pos + 3) === "/**") return text.slice(r.pos, r.end);
  }
  return undefined;
}

// The whole declaration (body included) plus its doc comment.
function full(mod, name) {
  const node = find(mod, name);
  const doc = jsdoc(node, mod.text);
  const body = mod.text.slice(node.getStart(mod.sf), node.end);
  return (doc !== undefined ? doc + "\n" : "") + body;
}

// A function as a body-less `declare` (signature + return type only); a type or
// interface is returned whole (there is no body to strip).
function declare(mod, name) {
  const node = find(mod, name);
  const doc = jsdoc(node, mod.text);
  const head = doc !== undefined ? doc + "\n" : "";
  if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
    const sig = mod.text
      .slice(node.getStart(mod.sf), node.body.getStart(mod.sf))
      .replace(/\s+$/, "");
    return head + sig.replace(/^export\s+function\s/, "export declare function ") + ";";
  }
  return head + mod.text.slice(node.getStart(mod.sf), node.end);
}

// A whole module's source with its leading import statements removed.
function withoutImports({ text, sf }) {
  const ends = sf.statements.filter(ts.isImportDeclaration).map((s) => s.end);
  const cut = ends.length > 0 ? Math.max(...ends) : 0;
  return text.slice(cut).trim();
}

// ── Boilerplate prose (lives only here — not duplicated from any source) ─────

const RULE = "=".repeat(77);
const banner = (title) => `// ${RULE}\n// ${title}\n// ${RULE}`;

const HEADER = `// ${RULE}
// MONOPOLY BOT — AUTHORING BRIEF  (self-contained; everything is in this file)
//
// You are being asked to author a Monopoly bot: ONE pure function that decides,
// for a given seat, the best move to make in any position of a standard US
// Monopoly game. Everything you need is in this single file — there is nothing
// else to read and nothing to import.
//
// -- THE GOAL: THE STRONGEST BOT THAT CAN BE BUILT. PRO LEVEL. ----------------
// This is NOT about producing a bot that merely works, or plays "okay." The
// target is the best possible Monopoly player: fast, tactical, strategic,
// ruthlessly optimal, super-rational. It must be a genuine threat to expert
// human players AND to other purpose-built bots. Winning is the only objective.
//
//   - The opponents you must beat are themselves merciless pros — optimal, fast,
//     and willing to exploit any weakness, including the fact that a seat is a
//     bot. Out-play exactly that. "Good enough" loses to them.
//   - Be PROACTIVE across the entire surface: buy, bid in auctions, build,
//     mortgage AND unmortgage, and — above all — TRADE at the right moment.
//     Trades are the mid-game engine that turns a near-monopoly into a completed
//     one; a purely reactive bot that never initiates a deal will lose to one
//     that does. Never sit on a winning position.
//   - Think in terms of TOTAL position value, not just cash on hand: completing
//     color sets, railroad synergy, the house-shortage squeeze, denying rivals
//     their last lot, liquidity vs. tempo. Every decision should ask "does this
//     raise the net worth of my seat relative to my opponents?"
//
// Deliver the strongest strategy you can devise, and explain your reasoning in
// the BOT notes your decisions carry. The bar is "the best bot possible."
//
// -- HOW TO USE WHAT YOU HAVE BEEN GIVEN -------------------------------------
// Below, in order: the full TYPE vocabulary (every shape you read or return),
// the BOT BOUNDARY (what you implement), the entire BOARD and every RULE
// CONSTANT, the READ-SIDE HELPERS you may call, a worked skeleton, and a RULES
// APPENDIX for the formulas that combine those numbers.
//
// Write ONE function and hand it back:
//
//     export const myBot: MonopolyBot = (state, playerId) => {
//       // ...your strategy...
//     };
//
// Monopoly is open information: you receive the ENTIRE GameState and your own
// seat id, every turn, in every phase. Return the move that seat should make now
// (a BotDecision — an Intent plus an optional reasoning \`note\`), or null to take
// the engine's default. The MonopolyBot type documents the phase-by-phase menu
// of what you may return when.
//
// -- YOU CANNOT BREAK THE GAME. IF IT COMPILES, IT IS SAFE. -------------------
// Two layers guarantee it, so you can play aggressively without fear:
//   1. TYPES — you can only ever return a well-formed Intent (or null). The
//      compiler will not let you express a malformed move.
//   2. RUNTIME — if you return null, a wrong-phase intent, or a move the engine
//      would reject, the engine substitutes that situation's guaranteed-legal
//      default. You can be a BAD player, never an illegal or game-breaking one.
// Reason your strategy out from this brief alone: you never have to mirror the
// engine's validation, and you owe no termination guards for your own actions.
//
// -- ABOUT THE HELPERS -------------------------------------------------------
// The functions in the "READ-SIDE HELPERS" section are DECLARED (signature +
// doc), not implemented here — their real bodies exist in the game engine and
// are wired in when your bot is integrated. Call any of them freely to read
// derived information. A few doc comments throughout mention engine internals
// (the "pacer", "autoStep", route handlers, the UI) — ignore those references;
// they do not affect how you author a bot.
// ${RULE}`;

const HELP_INTRO = `// These are DECLARED, not implemented here — the real bodies live in the game
// engine and resolve when your bot is wired in. You do not need them to RUN in
// order to author a bot: each signature + doc states exactly what it returns,
// and the RULES APPENDIX (bottom of file) gives the formula behind every
// non-trivial one. Call them freely.`;

const SKELETON = `// ${RULE}
// A STARTING SKELETON  (shape only — this is NOT a strategy)
//
// It demonstrates the mechanics: reading turn.phase, the off-turn "not me" null,
// attaching a note, and deferring to the engine's default with null. It buys an
// affordable landed-on lot and does nothing else — a placeholder that plays FAR
// below the bar. Your real bot must reason across buying, auctions, building,
// mortgaging, jail, and especially TRADES. Replace it entirely.
// ${RULE}
export const exampleBot: MonopolyBot = (state, playerId) => {
  const { phase, pendingBuy } = state.turn;

  if (phase === "buy-decision" && state.turn.playerId === playerId && pendingBuy !== undefined) {
    const me = state.players.find((p) => p.id === playerId);
    const price = ownablePrice(pendingBuy);
    if (me !== undefined && price !== null && me.cash >= price) {
      return {
        intent: { kind: "buy", playerId },
        note: \`Buying \${SPACES[pendingBuy].kind} for $\${price} -- affordable.\`,
      };
    }
    // Cannot (or will not) buy: null accepts the default (decline -> auction).
    return null;
  }

  // Every other seat/phase: no opinion. null = "accept the engine's default".
  return null;
};`;

const APPENDIX = `// ${RULE}
// RULES APPENDIX — the formulas that are LOGIC, not a constant lookup
//
// The board section above carries every NUMBER. This appendix covers the RULES
// that COMBINE those numbers — what you cannot read straight off a constant.
// Each points at the helper that already computes it, so you can call the helper
// OR reproduce the math.
//
// 1. MOVEMENT & GO. Positions are 0-39 clockwise from GO (0). A forward move
//    that wraps past 0 -- by dice or by a card's advance-to / advance-nearest --
//    credits PASS_GO_SALARY ($200). Landing exactly on GO pays it too. Going to
//    jail (tile 30, the cards, or three doubles -- see #6) does NOT pass GO.
//
// 2. RENT (helpers: rentAt for the menu, rentDue for the dollars owed).
//    - Property, no buildings: rent.base; DOUBLED (base x 2) when the owner holds
//      the whole color set (hasMonopoly) and the lot is unbuilt.
//    - Property with buildings: rent.houses[n-1] for n = 1-4 houses, rent.hotel
//      for a hotel. (Each space's rent ladder is in SPACES.)
//    - Railroad: RAILROAD_RENT[ownedCount-1] -> $25/$50/$100/$200 by how many
//      railroads the OWNER holds. (A Chance "nearest railroad" card pays 2x that.)
//    - Utility: diceTotal x UTILITY_MULT_PARTIAL (4) if the owner holds one,
//      x UTILITY_MULT_FULL (10) if both. (A Chance "nearest utility" card always
//      pays 10x a FRESH throw, regardless of how many the owner holds.)
//    - A mortgaged lot collects NO rent. You never pay rent to yourself; an
//      unowned lot has no rent.
//
// 3. BUYING & AUCTIONS. A landed-on lot costs its printed price. Decline and it
//    goes to an open-outcry auction: any still-in seat may bid an ABSOLUTE amount
//    (clients add BID_INCREMENT = $10 to the standing high), the leader cannot
//    drop, and the lot reverts to the bank if everyone passes with no bid. Your
//    hard ceiling is auctionBidCap(state, playerId) -- net worth (cash +
//    everything you could liquidate), minus 10% interest on a still-mortgaged
//    estate lot. The engine rejects any bid above it.
//
// 4. BUILDING (helpers: houseCostAt, buildingRefundAt, bankSupply,
//    builtLotsInGroup).
//    - One tier costs HOUSE_COST[color]; bare to hotel is five tiers (5x).
//      Selling a tier back refunds BUILDING_REFUND_PERCENT (50%).
//    - Build only on a FULL, UNMORTGAGED color set, and build/sell EVENLY: levels
//      across the set differ by at most 1 (add to the lowest lot, sell from the
//      highest).
//    - The bank ships TOTAL_HOUSES (32) and TOTAL_HOTELS (12). Building a hotel
//      returns its four houses to the bank -- the classic house-shortage squeeze
//      (hold at 4 houses to deny a rival the supply). If the bank cannot supply
//      enough houses to break a hotel down evenly, the hotel liquidates straight
//      to a bare lot in one step.
//
// 5. MORTGAGE (helpers: mortgageValueAt, unmortgageCostAt, mortgageInterestAt).
//    Mortgaging pays MORTGAGE_VALUE_PERCENT (50%) of the printed price, floored.
//    Lifting it costs that value + UNMORTGAGE_INTEREST_PERCENT (10%) interest,
//    ceiled. Taking on a still-mortgaged lot in a TRADE charges the receiver that
//    10% to the bank at once. You cannot mortgage a lot while any building stands
//    in its set (sell the set's buildings first -- builtLotsInGroup is the lock).
//
// 6. JAIL. You enter jail from the go-to-jail tile (position 30), a "go to jail"
//    card, or rolling three consecutive doubles in one turn. You leave by: a
//    Get-Out-of-Jail-Free card (heldJailCard), paying JAIL_FEE ($50), or rolling
//    doubles. Max three jail turns; a failed third roll forces the $50 then moves
//    you by that roll. While jailed you still collect rent and may manage / trade.
//
// 7. TRADES (helpers: tradeParticipants, tradeMortgageFees, projectTrade). Any
//    properties, Get-Out-of-Jail-Free cards, and cash may move between any
//    players; cashDelta must sum to zero (money only moves between players, never
//    to/from the bank), and the proposer need not be a party. Every NAMED
//    participant must approve -- a single decline kills the whole proposal. A lot
//    cannot change hands while its color set holds any building.
//
// 8. BANKRUPTCY. A debt you cannot cover even after liquidating everything
//    (auctionBidCap / maxBuildingSaleValue + mortgaging) makes you bankrupt. Your
//    estate passes to the creditor if a single player is owed, or is auctioned
//    lot-by-lot if the debt was to the bank.
// ${RULE}`;

// ── The boundary (from decision.ts; `Bot` re-presented as `MonopolyBot`) ─────

const boundary = [
  full(SRC.decision, "BotDecision"),
  full(SRC.decision, "Bot").replace(/\bexport type Bot\b/, "export type MonopolyBot"),
  full(SRC.decision, "move"),
].join("\n\n");

// ── The read-side helper catalog ─────────────────────────────────────────────

const HELPER_GROUPS = [
  ["Pricing & mortgage (by board position)", [
    ["logic", "ownablePrice"], ["logic", "mortgageValueAt"],
    ["logic", "unmortgageCostAt"], ["logic", "mortgageInterestAt"],
  ]],
  ["Rent", [["logic", "rentAt"], ["logic", "rentDue"]]],
  ["Sets, groups & development", [
    ["logic", "hasMonopoly"], ["development", "colorAt"],
    ["development", "groupPositions"], ["development", "developmentLevel"],
    ["development", "houseCostAt"], ["development", "buildingRefundAt"],
    ["development", "builtLotsInGroup"], ["development", "bankSupply"],
    ["development", "maxBuildingSaleValue"],
  ]],
  ["Jail", [["logic", "heldJailCard"]]],
  ["Solvency & auctions", [["engine", "firstNegativePlayer"], ["engine", "auctionBidCap"]]],
  ["Trades (model a deal before proposing or voting)", [
    ["engine", "tradeParticipants"], ["engine", "tradeMortgageFees"],
    ["engine", "projectTrade"],
  ]],
  ["Legality (OPTIONAL -- you never need this; the engine covers you)", [["engine", "isLegal"]]],
];

const helperSections = [
  HELP_INTRO,
  declare(SRC.logic, "RentDisplay"),
  declare(SRC.engine, "TradeProjection"),
  ...HELPER_GROUPS.map(([label, items]) =>
    [`// -- ${label} --`, ...items.map(([mod, name]) => declare(SRC[mod], name))].join("\n\n"),
  ),
].join("\n\n");

// ── ASCII normalization (so clipboard tools never mangle the text) ───────────

const ASCII = new Map([
  ["—", "--"], ["–", "-"], ["−", "-"], ["‘", "'"],
  ["’", "'"], ["“", '"'], ["”", '"'], ["…", "..."],
  ["×", "x"], ["≥", ">="], ["≤", "<="], ["→", "->"],
  ["·", "-"], ["•", "-"], [" ", " "],
]);

function toAscii(s) {
  const unknown = new Set();
  const out = s.replace(/[^\x00-\x7F]/g, (c) => {
    const mapped = ASCII.get(c);
    if (mapped !== undefined) return mapped;
    unknown.add(c);
    return "";
  });
  if (unknown.size > 0) {
    const codes = [...unknown].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase());
    process.stderr.write(`bot-brief: stripped unmapped non-ASCII: ${codes.join(", ")}\n`);
  }
  return out;
}

// ── Assemble ─────────────────────────────────────────────────────────────────

const brief = [
  HEADER,
  banner("PART 1 -- THE TYPE VOCABULARY  (every shape your bot reads or returns)"),
  withoutImports(SRC.types),
  banner("PART 2 -- THE BOT BOUNDARY  (what you implement and return)"),
  boundary,
  banner("PART 3 -- THE BOARD & RULE CONSTANTS  (every number to value a decision)"),
  withoutImports(SRC.data),
  banner("PART 4 -- READ-SIDE HELPERS  (declared; call them freely to read info)"),
  helperSections,
  SKELETON,
  APPENDIX,
].join("\n\n");

process.stdout.write(toAscii(brief) + "\n");
