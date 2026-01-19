---
title: "Strategies to Reduce Your Screen Time"
description: "A practical guide to reducing smartphone usage through intentional friction and behavioral changes."
publishDate: 2026-01-15
tags: ["Productivity", "Digital Wellness", "iOS", "JavaScript"]
---

Last year I was averaging 6+ hours of daily screen time. Most of it was mindless scrolling through apps designed by teams of engineers whose entire job is to keep me engaged. I decided to do something about it.

This post documents the strategies I used to cut my phone usage in half. Some of these ideas came from academic research, some from the [Healthy Screens](https://www.healthyscreens.org/) project, and some from my own experimentation. I've open-sourced everything in a [GitHub repo](https://github.com/BryceKeeler720/PhoneBricking) if you want to try it yourself.

## The Problem

The attention economy is real. Every app on your phone is competing for the same resource: your time. Social media platforms, news apps, even productivity tools are all optimized for engagement metrics. The result is a device that's genuinely difficult to put down.

Research from Columbia has documented the correlation between excessive phone usage and increased stress, anxiety, and sleep disruption. But knowing that doesn't make it easier to change behavior. The apps are too well designed.

So instead of relying on willpower, I decided to make my phone less appealing. The goal wasn't to stop using it entirely, just to add enough friction that I'd only pick it up when I actually needed it.

## Visual Modifications

The first change was the most impactful: **grayscale mode**. Turning off color removes a surprising amount of the dopamine hit from using your phone. Those red notification badges? Gray. Instagram photos? Gray. Games? Significantly less engaging.

A 2021 study by Holte et al. found that grayscale reduced daily screen time by approximately 40 minutes on average. In my experience, the effect was even stronger in the first few weeks before my brain adjusted.

On iOS, you can enable grayscale through:

```
Settings > Accessibility > Display & Text Size > Color Filters > Grayscale
```

I also made a few other visual changes:

- **Reduced refresh rate** from 120Hz to 60Hz. The screen feels noticeably less smooth, which makes scrolling less satisfying.
- **Disabled animations** through the Reduce Motion setting. No more satisfying transitions when opening apps.
- **Lowered brightness** and enabled the blue light filter permanently. The screen just looks worse.
- **Enabled Reduce Transparency** to flatten the UI. It's subtle, but it makes everything feel cheaper.

The cumulative effect is a phone that feels like a utility rather than an entertainment device. It still works fine for calls, texts, and maps. It's just not fun to use.

## Access Restrictions

Next, I made it harder to access the things I was wasting time on. The most effective change was **blocking the App Store entirely** using Screen Time restrictions. This prevents impulse downloads and makes it impossible to reinstall apps I've deleted.

I also **disabled Face ID** and switched to a long alphanumeric password. Unlocking my phone now takes 5-10 seconds instead of happening instantly. That small delay is often enough time to reconsider whether I actually need to check something.

For apps I couldn't delete (Messages, Mail), I moved them off the home screen entirely. They're still accessible through search, but the extra step reduces casual checking.

## Behavioral Changes

The technical changes helped, but the bigger impact came from changing my habits around phone usage.

**Do Not Disturb is always on.** I check notifications three times a day at set times: morning, lunch, and evening. This batching approach means I'm never interrupted, but I also never miss anything important. Urgent contacts can still reach me through the "Allow Calls From" exception.

**The phone stays in another room.** Research has shown that even having your phone visible on your desk reduces cognitive performance, even if it's face down and silent. Mine lives on a charger in the kitchen. If I need it, I have to get up and walk there.

**I leave it at home when I can.** Grocery store? Don't need it. Walk around the neighborhood? Don't need it. The more time I spend without it, the less I feel the urge to check it.

## Replacing Phone Tasks

A lot of my phone usage was for things that could be done better on other devices or not at all.

- **Alarm clock:** I bought a $15 alarm clock. It sits on my nightstand, which means my phone doesn't need to be in the bedroom.
- **Social media:** I only access these on my computer now. The extra friction of opening a laptop means I check them once or twice a day instead of dozens of times.
- **Music:** I set up [Jellyfin](https://jellyfin.org/) on my home server so I can stream my own library without needing Spotify.
- **Notes:** I keep a small notebook in my pocket. Writing by hand is slower, which means I'm more intentional about what I capture.

## Building Better Habits

Removing bad habits creates a void. If you don't fill it with something better, you'll drift back to the phone. I used some of the reclaimed time to build habits I'd been putting off.

To track these, I built a simple habit tracking widget using [Scriptable](https://scriptable.app/), an iOS app that lets you write JavaScript widgets. It shows a GitHub-style heatmap of my progress and current streaks. The code is in the repo if you want to use it.

I also started practicing what researchers call "attention restoration" - basically, learning to be bored. Instead of filling every idle moment with my phone, I just sit there. Waiting in line, riding the bus, whatever. It felt uncomfortable at first, but my ability to focus on longer tasks has noticeably improved.

## Results

After a few months of these changes, my average daily screen time dropped from 6+ hours to under 3. Most of that remaining time is intentional usage: navigation, messaging people, looking things up.

The unexpected benefit was how much better I sleep. No more checking my phone in bed, no more blue light before sleep, no more notification anxiety. I fall asleep faster and wake up feeling more rested.

The hardest part was the first two weeks. There's a real withdrawal period where you keep reaching for your phone out of habit. That fades with time, but it helps to have something else to do with your hands. I picked up a Rubik's cube.

## Try It Yourself

Everything I've described is documented in more detail in my [PhoneBricking repo](https://github.com/BryceKeeler720/PhoneBricking). It includes step-by-step instructions for each modification, links to the research papers I referenced, and the Scriptable widgets I built.

You don't have to do everything at once. Start with grayscale for a week and see how it feels. Add restrictions gradually. The goal isn't to make your phone unusable, just to make it a tool instead of a distraction.

If you try any of this, I'd be curious to hear how it goes. My contact info is on the [main site](/traditional#contact).
