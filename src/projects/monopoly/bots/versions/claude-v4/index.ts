// v4 candidate — self-contained snapshot (see EVOLUTION.md). Exposes the policy
// as `claudeV4Bot`, a drop-in `Bot` the simulator injects per seat for head-to-head
// A/B against the v3 base. Nothing here is wired into production `registry.ts`;
// promotion to the live `claude` strategy is a human green-light.
export { policy as claudeV4Bot } from "./policy";
