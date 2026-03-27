# Skill 2: Workflow Bottleneck Analysis
**Source: 10 Skills That Replace a $1MM Consulting Engagement — Grant Baldwin**

> Big Consulting bills $250K for a team to map your processes.

You cannot automate a broken process. This analysis hunts down the exact moments where your business slows down, bleeds money, or drops the ball. We are looking for high-friction, low-judgment tasks that are begging for AI.

---

## The Skill Prompt (Copy into Claude Opus 4.6)

```
Act as an expert operations engineer specializing in AI workflow optimization. I will provide you with a breakdown of a core business process, including step-by-step descriptions, cycle times, human handoff points, and error rates.

Your task is to identify exactly where this process is breaking down and WHERE AI can be applied to remove friction.

Provide your analysis in this format:

1. BOTTLENECK MAP: Identify the 3 slowest or most error-prone steps. Explain exactly why these steps are failing based on the data provided.

2. AUTOMATION OPPORTUNITY SCORE (1-100): Rate each bottleneck on how easily it can be automated using current LLMs or AI tools. High scores go to text-heavy, repetitive, low-judgment tasks. Low scores go to tasks requiring deep human empathy or physical action.

3. THE AI FIX: For the highest-scoring opportunity, write a specific, practical recommendation on exactly which type of AI tool should replace or augment the manual step.

Ask me for clarification if the handoff points between departments are not clearly defined.
```

---

## What to Feed It

- A step-by-step written walkthrough of a specific business process
- Average time it takes to complete each step
- Exactly who hands work to whom
- Where mistakes happen most often

## What You Get Back

- A prioritized list of your worst bottlenecks
- An automation score for every single broken step
- A highly specific AI solution for the biggest time-waster

## Where AI Falls Short

The AI does not know about the shadow processes your team invented to survive a bad system. You have to dig those out of your employees yourself.
