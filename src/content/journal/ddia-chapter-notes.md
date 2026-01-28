---
title: "DDIA: distributed consensus"
publishDate: 2026-01-12
tags: ["books", "learning"]
---

Finished the distributed consensus chapter in Designing Data-Intensive Applications. The progression from single-leader to multi-leader to leaderless replication makes the trade-offs concrete. Raft is elegant -- the leader election protocol is surprisingly simple once you see it animated.

Key takeaway: CAP theorem is often misunderstood. It's really about what happens during a network partition, not a general three-way trade-off. In practice you're always choosing between consistency and availability during partitions.
