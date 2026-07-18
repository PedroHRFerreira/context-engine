---
name: parallel-delivery
description: Use when a feature touches domain, UI and routing at once and can be split across agents.
---

# Parallel Delivery

Use this fixed six-agent delivery graph. The coordinator is outside the count, owns the plan and integration, and is the only role that receives agent deliveries.

## Delivery Graph

1. **Domain** — stores, types, and contracts. No dependency.
2. **Isolated validation or rule** — validation or business rule that can be implemented independently. No dependency; run in parallel with agent 1.
3. **Primary UI** — depends on agent 1.
4. **Complementary UI and error states** — depends on agents 1 and 2.
5. **Routing and flow orchestration** — depends on agent 1.
6. **Visual integration, SCSS, and review of agents 3 and 4** — starts only after agents 3, 4, and 5 have delivered to the coordinator.

## Execution Rules

1. Adapt each role to the feature without changing the count or dependency order.
2. Before starting, every agent declares the files it owns; the coordinator resolves overlaps.
3. Do not start an agent until all of its dependencies are complete and accepted by the coordinator.
4. Agents deliver only to the coordinator, never directly to a dependent agent.
5. Agents 3, 4, and 5 may run in parallel as soon as their dependencies are accepted.
6. The coordinator integrates deliveries, resolves conflicts, and applies the `quality` and `review` skills before marking the feature done.

This is a prompt-orchestration workflow. Do not require or imply a dedicated `rods flow run` mode.
