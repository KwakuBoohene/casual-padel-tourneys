# Spec Template

> Fill in each section. If a section doesn't apply, write "N/A" with a one-line reason.
> Target: under 10 minutes. If it takes longer, the task is too big — break it down first with `padel-planner`.

**Ticket path:** `plans/design/<feature-slug>/<nn>-<short-name>.md` (design) or `plans/implementation/<feature-slug>/<nn>-<short-name>.md` (implementation)

## 1. Problem Description

What are we solving? Plain English, 2-4 sentences.

_[Describe the problem or need. Why does this matter? Who is affected?]_

## 2. Acceptance Criteria

Checklist of "done". Each item must be testable and specific.

- [ ] _[Criterion 1]_
- [ ] _[Criterion 2]_
- [ ] _[Criterion 3]_

## 3. Implementation Plan

How to build it. Key steps and approach.

1. _[Step 1]_
2. _[Step 2]_
3. _[Step 3]_

**Key files to modify:**
- _[file path — reason]_

## 4. PR Breakdown

If the implementation exceeds 800 lines, list the planned PR slices. Each PR should be independently mergeable and not break main.

| PR | Scope | Est. Lines |
|----|-------|-----------|
| 1  | _[scope]_ | _[lines]_ |

_If single PR under 800 lines, write: "Single PR — estimated ~X lines."_

## 5. Diagrams

Flow, sequence, or architecture diagrams. Only when they clarify something that text alone cannot.

_[Mermaid/ASCII diagram or "Not needed — straightforward implementation."]_

## 6. Edge Cases

Unusual inputs, boundary conditions, failure modes.

- _[Edge case 1 — how to handle]_
- _[Edge case 2 — how to handle]_

## 7. Out of Scope

What this task does NOT cover. Prevents scope creep.

- _[Exclusion 1]_
- _[Exclusion 2]_

## 8. Test Plan

How to verify it works. What testing evidence is required before marking Done.

- _[Test scenario 1]_
- _[Test scenario 2]_
- _[Test scenario 3]_

**Testing evidence type:** _[Unit tests / Integration tests / Manual verification / Screenshots / All of the above]_
