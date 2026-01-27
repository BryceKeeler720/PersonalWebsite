---
title: "Homelab storage expansion"
publishDate: 2026-01-05
tags: ["homelab", "hardware"]
---

Added two 4TB drives to the TrueNAS pool. Went with a RAIDZ1 configuration since this is mostly media and backups -- not critical enough to justify the capacity loss of RAIDZ2.

The migration took longer than expected. Had to rebuild the pool from scratch because ZFS doesn't support adding drives to an existing RAIDZ vdev. Lesson learned: plan your pool layout from the start.

Total usable storage now sits at around 10TB. Should be enough for a while.
