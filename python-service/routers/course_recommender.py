"""
Router: /recommend-courses
Ported from AdaptIQ's backend/rec_courses.py (TF-IDF + cosine similarity).

Takes a skill name and returns the most relevant Udemy course(s).
The sampled_data.csv dataset is loaded lazily on first request and cached.

Called by: server/src/agents/recommendationAgent.js (Phase 6)
"""

import os
import functools
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class CourseRequest(BaseModel):
    skill: str
    num_recommendations: Optional[int] = 3


class CourseRecommendation(BaseModel):
    title: str
    url: str
    similarity_score: float


class CourseResponse(BaseModel):
    skill: str
    recommendations: List[CourseRecommendation]


@functools.lru_cache(maxsize=1)
def _load_vectorizer_and_matrix():
    """
    Load sampled_data.csv and build TF-IDF matrix once.
    Cached via lru_cache so we only do this on first request.
    """
    import pandas as pd  # type: ignore
    from sklearn.feature_extraction.text import TfidfVectorizer
    import re

    csv_path = os.path.join(os.path.dirname(__file__), "..", "sampled_data.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"sampled_data.csv not found at {csv_path}")

    df = pd.read_csv(csv_path)

    # Basic text cleaning (mirrors AdaptIQ's nfx.remove_stopwords / remove_special_characters)
    stop_words = {
        "a", "an", "the", "and", "or", "for", "in", "on", "to", "of",
        "with", "by", "from", "at", "is", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did",
    }

    def clean_text(text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        tokens = [t for t in text.split() if t not in stop_words]
        return " ".join(tokens)

    df["cleaned_title"] = df["title"].apply(clean_text)

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(df["cleaned_title"])

    return df, vectorizer, tfidf_matrix


@router.post("/recommend-courses", response_model=CourseResponse)
async def recommend_courses(request: CourseRequest):
    """
    Return the top N Udemy courses most similar to the given skill.
    Algorithm: TF-IDF vectorization + cosine similarity (AdaptIQ port).
    """
    if not request.skill.strip():
        raise HTTPException(status_code=400, detail="skill cannot be empty")

    num = min(max(request.num_recommendations or 3, 1), 10)

    try:
        from sklearn.metrics.pairwise import cosine_similarity
        import re

        df, vectorizer, tfidf_matrix = _load_vectorizer_and_matrix()

        # Clean and vectorize the input skill the same way as the titles
        stop_words = {
            "a", "an", "the", "and", "or", "for", "in", "on", "to", "of",
            "with", "by", "from", "at", "is", "are", "was", "were", "be",
            "been", "being", "have", "has", "had", "do", "does", "did",
        }

        def clean_text(text: str) -> str:
            text = text.lower()
            text = re.sub(r"[^a-z0-9\s]", " ", text)
            tokens = [t for t in text.split() if t not in stop_words]
            return " ".join(tokens)

        cleaned_skill = clean_text(request.skill)
        input_vec = vectorizer.transform([cleaned_skill])

        # Cosine similarity of input against all titles
        scores = cosine_similarity(input_vec, tfidf_matrix).flatten()
        top_indices = scores.argsort()[::-1][:num]

        recommendations = []
        for idx in top_indices:
            row = df.iloc[idx]
            course_url = str(row.get("course_url", ""))
            if not course_url.startswith("http"):
                course_url = "https://www.udemy.com" + course_url
            recommendations.append(
                CourseRecommendation(
                    title=str(row["title"]),
                    url=course_url,
                    similarity_score=round(float(scores[idx]), 4),
                )
            )

        return CourseResponse(skill=request.skill, recommendations=recommendations)

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Course recommendation failed: {str(e)}")
