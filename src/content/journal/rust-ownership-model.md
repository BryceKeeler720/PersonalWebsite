---
title: "Understanding Rust's ownership model"
publishDate: 2025-12-03
tags: ["rust", "learning"]
---

Spent the evening working through the ownership chapter in The Rust Programming Language. The borrow checker finally makes sense when you think of it as enforcing the single-writer-or-multiple-readers rule at compile time. Lifetimes are still confusing but I think they'll click once I work through more examples.

The move semantics are interesting compared to C++ -- Rust moves by default instead of copying, which eliminates a whole class of bugs. Going to rewrite my CLI tool in Rust as practice.
