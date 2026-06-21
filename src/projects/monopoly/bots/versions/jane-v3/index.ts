// jane-v3 — fork of jane-v2. Makes the spread floor DYNAMIC: 4 houses when
// flush, 2 when cash-tight. Tests whether the static floor of 3 in jane-v2
// was suboptimal — more coverage when rich, cheaper spread when poor.
export { claudeBot as janeV3Bot } from "./claude";
