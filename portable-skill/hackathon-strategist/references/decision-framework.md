# Decision framework

Use this reference whenever ranking hackathons, scoring ideas, or assessing whether agents can do meaningful work.

## Hackathon priority score

Score each factor from 0–100, then calculate:

`priority = deadline urgency × .25 + agent feasibility × .20 + strategic fit × .20 + win opportunity × .20 + effort/return × .15`

- **Deadline urgency:** enough time remains to produce a strong entry. Very distant events are less urgent; expired or unrealistic deadlines fail the gate rather than receiving a high urgency score.
- **Agent feasibility:** agents can perform the software, research, testing, documentation, and pitch-preparation work with accessible tools and data.
- **Strategic fit:** the team’s strengths and interests match the event’s technologies, domain, and constraints.
- **Win opportunity:** the team can make the sponsor technology indispensable, tell a differentiated story, and satisfy the judging rubric.
- **Effort/return:** expected upside relative to time, complexity, eligibility friction, travel, hardware, credentials, and other dependencies.

Before scoring, apply hard gates for eligibility, open deadline, required attendance, and access to mandatory technology. A failed hard gate cannot be disguised by a strong weighted score.

When deadlines are unknown, mark them unknown and lower confidence. Never create a calendar date from a vague phrase such as “next month.”

## Agent feasibility

Start from 100 and assess these dimensions:

| Dimension | High feasibility | Lower feasibility |
| --- | --- | --- |
| Work medium | Software, docs, research, test automation | Hardware fabrication or physical field work |
| Access | Public docs/APIs and supplied repository | Closed data, missing accounts, gated credentials |
| Verification | Deterministic tests or visible browser flow | Subjective real-world outcomes with no proxy |
| Coordination | Work contained to project and provided systems | Recruitment, negotiation, interviews, approvals |
| Consequence | Reversible prototype decisions | Legal, medical, financial, or safety-critical judgment |

Interpret the final score:

- **80–100, High:** agents can execute most research and software work; humans handle accounts, consent, real-world validation, and submission.
- **55–79, Mixed:** agents can build meaningful components but one or more central dependencies require human coordination or unavailable access.
- **0–54, Low:** the differentiating work is mostly physical, relationship-driven, regulated, inaccessible, or not testable by the available agents.

Always list concrete work in three buckets: agents can execute; agents can assist with human review or access; and human action required.

## Idea score

Score each candidate on the same five dimensions. Default to equal weighting unless the published rubric justifies different weights.

- **Organizer alignment:** the idea advances the organizer’s product or ecosystem motion and uses its infrastructure in the critical path.
- **Judge appeal:** it directly satisfies published criteria and produces a legible competition story.
- **Feasibility:** a credible end-to-end golden path can ship in the available window with the actual team and access.
- **Differentiation:** the insight and workflow are distinct from obvious wrappers or crowded submissions.
- **Demo power:** the value appears through a fast, reliable, visual before-and-after.

Apply penalties after the weighted score:

- subtract 10–20 for a decorative sponsor integration;
- subtract 10–20 for a mandatory but unverified external dependency;
- subtract 5–15 for a broad multi-user or marketplace scope;
- reject ideas that fail eligibility, require prohibited data, or cannot demonstrate their core claim.

## Confidence

Report both score and confidence. Use high confidence only when rules, deadline, organizer identity, and core infrastructure are verified from primary sources. A precise score is not a substitute for evidence.
