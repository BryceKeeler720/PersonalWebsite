---
title: "Bayesian inference intuition"
publishDate: 2025-12-18
tags: ["statistics", "learning", "MIT"]
---

The key insight from this week's MIT MicroMasters module: Bayesian inference is just updating beliefs with evidence. Prior times likelihood gives posterior (up to normalization). The conjugate prior trick makes the math tractable for common distributions.

Worked through the beta-binomial example. If you start with a Beta(1,1) prior (uniform), after observing 7 heads in 10 flips, your posterior is Beta(8,4). The posterior mean is 8/12 = 0.667, which is pulled toward 0.5 compared to the MLE of 0.7. That's regularization happening naturally.

The hierarchical models section is next. Looking forward to seeing how this connects to modern ML.
