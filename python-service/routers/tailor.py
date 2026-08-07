from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from services.job_intelligence_service import generate_tailored_resume

router = APIRouter()

class TailorRequest(BaseModel):
    resume_json: Dict[str, Any]
    job_description: str

class TailorResponse(BaseModel):
    tailored_resume: Dict[str, Any]

@router.post("/tailor", response_model=TailorResponse)
async def tailor_endpoint(request: TailorRequest):
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")
    
    try:
        tailored = await generate_tailored_resume(request.resume_json, request.job_description)
        return {"tailored_resume": tailored}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tailored resume generation failed: {str(e)}")
