# Skill 9: Data Readiness Audit
**Source: 10 Skills That Replace a $1MM Consulting Engagement — Grant Baldwin**

> Big Consulting charges $100–150K for a "readiness assessment."

Everyone thinks their data is ready for AI. It almost NEVER is. This audit exposes the dirty, siloed, inaccessible reality of your data architecture. It forces you to see the gaps before you waste millions building on top of a rotten foundation.

---

## The Skill Prompt (Copy into Claude Opus 4.6)

```
You are a Lead Data Architect. Your task is to audit our current data infrastructure and determine if we are actually ready to deploy enterprise AI.

I will provide you with descriptions of our current data sources, our storage architecture, our schema structures, and our existing data governance policies.

You must evaluate our infrastructure using a ruthless standard. Assume our data is messy until proven otherwise.

Deliver a Data Quality Scorecard broken down into these categories:
1. Accessibility: Are the necessary APIs in place? Can the AI actually reach the data it needs in real-time?
2. Cleanliness and Structure: Identify the likely areas of unstructured chaos based on my inputs. Where will the AI choke on bad formatting?
3. Security and Governance: Highlight the immediate compliance risks. Where are we at risk of feeding sensitive PII into a Large Language Model?
4. The Remediation Roadmap: Give me a prioritized list of the top 3 engineering tasks we MUST complete before we write a single line of AI code.

Do not give me theoretical best practices. Give me a harsh, actionable critique of the architecture described in the prompt.
```

---

## What to Feed It

- A list of your core software systems (CRM, ERP, etc.)
- How your data is currently stored (cloud, on-prem, spreadsheets)
- Any known issues with your data quality
- Your current security and privacy requirements

## What You Get Back

- A brutally honest assessment of your infrastructure
- Specific security vulnerabilities you are ignoring
- The exact engineering tasks required to fix the mess

## Where AI Falls Short

AI can point out that your data is garbage. It cannot do the painful, manual engineering work required to actually clean it up.
