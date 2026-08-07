# ExplanationTrace Schema Specification

This document defines the canonical JSON schema for `ExplanationTrace` objects produced by `evaluatorAgent.js` and validated by `criticAgent.js`. Reused across all AI output features (resume scoring, JD matching, skill recommendations, and career suggestions).

## JSON Structure

```json
{
  "output": "string (e.g. 'Overall Match Score: 82/100')",
  "reasoning": [
    {
      "factor": "string (e.g. 'Technical Skill Alignment')",
      "weight": 0.35,
      "score": 0.85,
      "evidence": "string (e.g. 'Matched 7 of 8 core technical skills')"
    }
  ],
  "confidence": 0.88,
  "alternatives": [
    "string (e.g. 'Adding Docker and Kubernetes experience would raise match score by +10%')"
  ],
  "sources": [
    "string (e.g. 'resume.sections.skills', 'jd.requirements[2]', 'memory:60f1b2c3')"
  ]
}
```

## Field Definitions

| Field | Type | Description |
|---|---|---|
| `output` | String | Human-readable summary of the target AI output |
| `reasoning` | Array\<Object\> | Structured factor breakdown used to compute the result |
| `reasoning[].factor` | String | Name of the evaluation criteria |
| `reasoning[].weight` | Number (0–1) | Relative weight of this factor in the overall calculation (sum of weights = 1.0) |
| `reasoning[].score` | Number (0–1) | Evaluated score for this specific factor |
| `reasoning[].evidence` | String | Exact quote or factual evidence supporting the score |
| `confidence` | Number (0–1) | Overall confidence level of the AI's assessment (reuses Phase 3 float convention) |
| `alternatives` | Array\<String\> | Actionable suggestions on how the user can improve the outcome |
| `sources` | Array\<String\> | Path or ID references to the underlying source data |

## Confidence Scale

- **High Confidence (≥ 0.85)**: Explicit evidence in resume and JD. Shown with Green badge.
- **Medium Confidence (0.70–0.84)**: Strong inference supported by profile history. Shown with Amber badge.
- **Low Confidence (< 0.70)**: Unconfirmed inference flagged by `criticAgent.js`. Shown with Red/Gray warning badge.
