"""
Router: /skill-gap
Ported from AdaptIQ's backend/app.py /skill-analyzer endpoint.

Takes raw job description text + optional resume sections and returns the
AdaptIQ 4-field skill-gap schema:
  - skills_from_resume       (what the resume already shows)
  - skills_required_in_job   (what the JD needs)
  - matching_skills          (intersection via embeddings)
  - skills_to_improve        (gap — in JD but not matched)
  - must_have                (critical JD requirements)
  - nice_to_have             (bonus JD requirements)
  - seniority                (senior/mid/junior/unspecified)

Called by: server/src/agents/jdAgent.js via python-service /skill-gap
"""

import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from services.mistral_service import extract_job_skills
from services.embedding_service import match_skills

router = APIRouter()


class SkillGapRequest(BaseModel):
    job_description: str
    resume_sections: Optional[Dict[str, Any]] = None


class SkillGapResponse(BaseModel):
    skills_from_resume: List[str]
    skills_required_in_job: List[str]
    matching_skills: List[str]
    skills_to_improve: List[str]
    must_have: List[str]
    nice_to_have: List[str]
    seniority: str


def _extract_skills_from_resume(resume_sections: Optional[Dict[str, Any]]) -> List[str]:
    """
    Pull skills from the resume sections object.
    Combines explicit skills[] array with tech keywords found in experience bullets.
    """
    if not resume_sections:
        return []

    skills: List[str] = list(resume_sections.get("skills", []))

    # Also harvest tech terms from experience bullets (shallow extraction)
    for exp in resume_sections.get("experience", []):
        for bullet in exp.get("bullets", []):
            # Short tokens that look like tech skills (letters/numbers/+/#/.)
            tokens = re.findall(r"\b[A-Za-z][A-Za-z0-9+#.\-]{1,25}\b", bullet)
            # Heuristic: likely a tech keyword if it starts uppercase or has digits
            tech_tokens = [
                t for t in tokens
                if (t[0].isupper() or any(c.isdigit() for c in t))
                and len(t) > 1
            ]
            skills.extend(tech_tokens)

    # Deduplicate (case-insensitive)
    seen = set()
    unique: List[str] = []
    for s in skills:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            unique.append(s)

    return unique


def _detect_seniority(job_description: str) -> str:
    """Simple rule-based seniority detection from JD text."""
    lower = job_description.lower()
    if any(kw in lower for kw in ["senior", "sr.", "lead", "principal", "staff", "architect"]):
        return "senior"
    if any(kw in lower for kw in ["junior", "jr.", "entry level", "entry-level", "graduate", "intern"]):
        return "junior"
    if any(kw in lower for kw in ["mid-level", "mid level", "intermediate", "associate"]):
        return "mid"
    return "unspecified"


@router.post("/skill-gap", response_model=SkillGapResponse)
async def skill_gap_endpoint(request: SkillGapRequest):
    """
    AdaptIQ-style skill-gap analysis.
    Combines Mistral JD extraction + sentence-transformer matching.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty")

    try:
        # Step 1: Extract required skills from JD via Mistral
        all_jd_skills = await extract_job_skills(request.job_description)

        # Step 2: Heuristically split must-have vs nice-to-have
        lower_jd = request.job_description.lower()
        nice_keywords = ["nice to have", "nice-to-have", "preferred", "bonus", "plus", "desirable"]
        must_have = all_jd_skills  # default: treat all as must-have
        nice_to_have: List[str] = []

        # If JD has explicit nice-to-have section, find skills mentioned after those markers
        for marker in nice_keywords:
            idx = lower_jd.find(marker)
            if idx != -1:
                jd_after = request.job_description[idx:]
                nice_skills = await extract_job_skills(jd_after)
                nice_to_have = nice_skills
                must_have = [s for s in all_jd_skills if s not in nice_to_have]
                break

        # Step 3: Extract skills from resume sections (if provided)
        skills_from_resume = _extract_skills_from_resume(request.resume_sections)

        # Step 4: Semantic matching via embeddings
        if skills_from_resume:
            match_result = await match_skills(skills_from_resume, all_jd_skills)
            matching_skills = match_result.get("matched", [])
            skills_to_improve = match_result.get("missing", [])
        else:
            matching_skills = []
            skills_to_improve = all_jd_skills

        # Step 5: Seniority
        seniority = _detect_seniority(request.job_description)

        return SkillGapResponse(
            skills_from_resume=skills_from_resume,
            skills_required_in_job=all_jd_skills,
            matching_skills=matching_skills,
            skills_to_improve=skills_to_improve,
            must_have=must_have,
            nice_to_have=nice_to_have,
            seniority=seniority,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill gap analysis failed: {str(e)}")
