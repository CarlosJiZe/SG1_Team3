# Personal Reflection: GreenGrid — Phase 3
**Student:** Carlos Jiménez Zepeda
**Team:** Team 3
**Date:** May 14, 2026

---

## Executive Summary

Phase 3 closed the loop on something I had always taken for granted. Throughout my finance coursework, predictive models were tools I used without fully understanding what was happening inside them. Implementing linear regression from scratch, by hand, changed that. It also forced me to confront a new kind of integration challenge: how do you add a layer of real-world intelligence to a dashboard that already tells a complete story, without breaking the narrative? The answer turned out to be more interesting than I expected.

---

## My Role in Phase 3

My responsibilities in this phase covered the full ML pipeline and the dashboard integration. This included the exploratory data analysis, the feature engineering and cleaning process, training the regression model without any ML libraries, building the SolarPredictor bridge class, integrating the predictor into the simulator, running both ML simulation scenarios, and implementing the dashboard reality toggle with its corresponding narrative text changes.

---

## Building a Model I Had Always Used as a Black Box

In several finance courses, linear regression is a standard tool for forecasting inflation, unemployment, and asset prices. In Excel you highlight your data, run a few clicks, and get coefficients, R-squared values, and residual plots. In Gretl you need slightly more knowledge, but the software still runs all possible variable combinations automatically and presents you with the best model. What happens behind those interfaces was always a complete unknown to me.

Implementing gradient descent from scratch, writing the cost function, updating weights manually iteration by iteration, was genuinely clarifying. The math behind these models is not inaccessible. It requires a solid understanding of statistics and linear algebra, but it is entirely within reach. What surprised me most was how familiar some of the concepts already felt from my finance background. The logic of minimizing a loss function is structurally similar to how I had been taught to think about optimization in portfolio theory. The connection was not obvious until I was writing the code, but once I saw it, the whole thing felt much less foreign.

The feature selection process was also more interesting than I anticipated. In Gretl, you submit your dataset and the software evaluates every combination of variables for you. Here I had to run 29 experiments manually, compare RMSE and R-squared values, and make a reasoned argument for why a particular combination of features produced the best result. That process taught me something I had never thought about: what it actually means to save a trained model. A trained model is just a set of parameter values that minimize prediction error on your data. Saving it means writing those values to a file. That is the entire thing, and I had always imagined it as something far more complicated.

---

## The Moment the EDA Stopped Being Tedious

I went into the exploratory data analysis expecting it to be the slowest part of the phase, and in some ways it was. The dataset had a double header that required skipping rows, and the first correlations I computed made no sense at all. GHI, which should be the strongest predictor of solar output, was showing a negative correlation with actual power. I spent time investigating the variables themselves because I had no prior knowledge of what GHI, DNI, or clearsky irradiance actually were or what realistic ranges looked like.

The answer turned out to be a timezone mismatch. The actual power CSV was in local time. The weather CSV was in UTC. Eight hours of offset were enough to invert every relationship in the data. Once I corrected the alignment, GHI correlation jumped from negative 0.35 to positive 0.96. That single discovery made the entire EDA worthwhile. It also confirmed something I already believed from working with financial data: if your inputs are wrong, your model will be wrong regardless of how sophisticated it is. A clean dataset is not a bureaucratic formality. It is the foundation on which everything else rests.

---

## The Narrative Problem

When the model was trained and integrated into the simulator, I ran the ML scenarios and looked at the results. The unadvised Sacramento system, which in Phase 2 had been paying a positive net cost, was now breaking even or earning small returns. Sacramento's solar resource is exceptional enough that even a poorly designed system performs acceptably.

This created a real problem. The dashboard I had built in Phase 2 told a story built around the contrast between paying money and earning money. The ML data softened that contrast significantly. I had to decide how to present results that were true but that complicated a narrative I had spent weeks refining.

The solution was a toggle. Rather than replacing the Phase 2 narrative with the ML narrative, I designed a mechanism that lets the user move between them. The synthetic simulation shows what happens under idealized conditions. The Sacramento data shows what happens in one of the best solar climates in California. The two views are not contradictory. They serve different purposes: the synthetic model makes the design principles clear, and the real data tests whether those principles hold when exposed to an actual sky.

The narrative shift also required rethinking what the mistake section was actually arguing. In a privileged solar location, a bad design is not a financial disaster. It is a missed opportunity. The gap between the unadvised and well-designed Sacramento scenarios is not a penalty for poor planning. It is the difference between a modest return and a significant one. Framing it that way required abandoning some of the language from Phase 2 and finding a new angle, which turned out to be a more honest argument anyway.

---

## What I Learned About Myself

This phase reinforced something Phase 2 had started to show me: my most useful contributions to this project have come from moments where I was translating between domains. Connecting regression theory to portfolio optimization. Connecting a timezone bug to a data integrity principle I already understood from finance. Connecting a narrative problem to a design solution. The specific technical skills involved in those moments were learnable. The orientation toward asking why something matters and for whom it matters was already there.

---

## Conclusion

Phase 3 was the most technically dense part of this project and also, unexpectedly, one of the most conceptually satisfying. Implementing a model I had always used as a tool gave me a clearer picture of what these tools actually are and what it takes to use them responsibly. Integrating that model into a finished product without breaking what the product was designed to communicate required a different kind of thinking entirely. Both challenges were worth the effort, and the combination of them is the closest this program has come to replicating what I imagine real applied data science feels like.