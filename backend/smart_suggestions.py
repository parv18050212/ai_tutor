# smart_suggestions.py
import os
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from supabase import Client

# Import dependencies that will be passed from main
router = APIRouter()

# Import the authentication function
from auth import get_current_user

# Models
class StudyRecommendation(BaseModel):
    type: str  # "concept_review", "practice_more", "difficulty_adjustment", "study_plan"
    title: str
    description: str
    priority: int  # 1-5, 5 being highest
    action_type: str  # "quiz", "tutor_chat", "concept_review", "practice"
    target_concept: Optional[str] = None
    target_chapter: Optional[str] = None
    target_subject: Optional[str] = None
    estimated_time_minutes: int
    difficulty_level: Optional[str] = None

class SmartSuggestionsRequest(BaseModel):
    user_id: str
    exam_type: Optional[str] = None
    days_back: int = 30

class SmartSuggestionsResponse(BaseModel):
    recommendations: List[StudyRecommendation]
    study_insights: Dict[str, Any]
    performance_summary: Dict[str, Any]
    next_best_actions: List[str]

# Global dependencies - will be set during initialization
_supabase: Optional[Client] = None
_auth_dependency: Optional[callable] = None

def init_suggestions_module(supabase_client: Client, auth_dependency: callable):
    """Initialize the smart suggestions module with dependencies from main.py"""
    global _supabase, _auth_dependency
    _supabase = supabase_client
    _auth_dependency = auth_dependency

def get_supabase() -> Client:
    """Get the initialized Supabase client"""
    if _supabase is None:
        raise HTTPException(status_code=500, detail="Suggestions module not properly initialized")
    return _supabase

# Removed get_auth_dependency - using get_current_user directly

def analyze_quiz_performance(quiz_results: List[Dict]) -> Dict[str, Any]:
    """Analyze quiz performance patterns to identify strengths and weaknesses"""
    if not quiz_results:
        return {"weak_concepts": [], "strong_concepts": [], "performance_trend": "no_data"}

    # Analyze concept performance
    concept_performance = {}
    total_scores = []
    time_performance = []

    for quiz in quiz_results:
        total_scores.append(quiz["score"] / quiz["total_questions"] * 100)

        # Track time efficiency
        expected_time = quiz["total_questions"] * 120  # 2 minutes per question
        actual_time = quiz.get("time_taken", expected_time)
        time_efficiency = expected_time / max(actual_time, 1)
        time_performance.append(time_efficiency)

        # Analyze concepts needing work
        for concept in quiz.get("concepts_needing_work", []):
            if concept not in concept_performance:
                concept_performance[concept] = {"correct": 0, "total": 0, "frequency": 0}
            concept_performance[concept]["total"] += 1
            concept_performance[concept]["frequency"] += 1

        # Analyze mastered concepts
        for concept in quiz.get("concepts_mastered", []):
            if concept not in concept_performance:
                concept_performance[concept] = {"correct": 0, "total": 0, "frequency": 0}
            concept_performance[concept]["correct"] += 1
            concept_performance[concept]["total"] += 1
            concept_performance[concept]["frequency"] += 1

    # Calculate performance trends
    if len(total_scores) >= 3:
        recent_avg = sum(total_scores[:3]) / 3
        older_avg = sum(total_scores[-3:]) / 3
        if recent_avg > older_avg + 10:
            trend = "improving"
        elif recent_avg < older_avg - 10:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    # Identify weak and strong concepts
    weak_concepts = []
    strong_concepts = []

    for concept, perf in concept_performance.items():
        if perf["total"] >= 2:  # Only consider concepts with multiple attempts
            accuracy = perf["correct"] / perf["total"]
            if accuracy < 0.6:
                weak_concepts.append({
                    "concept": concept,
                    "accuracy": accuracy,
                    "frequency": perf["frequency"]
                })
            elif accuracy >= 0.8:
                strong_concepts.append({
                    "concept": concept,
                    "accuracy": accuracy,
                    "frequency": perf["frequency"]
                })

    # Sort by frequency and accuracy
    weak_concepts.sort(key=lambda x: (x["frequency"], -x["accuracy"]), reverse=True)
    strong_concepts.sort(key=lambda x: (x["frequency"], x["accuracy"]), reverse=True)

    return {
        "weak_concepts": weak_concepts[:5],  # Top 5 weak concepts
        "strong_concepts": strong_concepts[:5],  # Top 5 strong concepts
        "performance_trend": trend,
        "average_score": sum(total_scores) / len(total_scores) if total_scores else 0,
        "average_time_efficiency": sum(time_performance) / len(time_performance) if time_performance else 1,
        "total_quizzes": len(quiz_results)
    }

def generate_ai_study_recommendations(user_analysis: Dict[str, Any], exam_type: str) -> List[str]:
    """Use AI to generate personalized study recommendations"""
    try:
        # Prepare context for AI
        weak_concepts = [c["concept"] for c in user_analysis.get("weak_concepts", [])]
        strong_concepts = [c["concept"] for c in user_analysis.get("strong_concepts", [])]
        performance_trend = user_analysis.get("performance_trend", "no_data")
        average_score = user_analysis.get("average_score", 0)

        prompt = f"""
You are an expert AI tutor analyzing a student's {exam_type.upper()} preparation performance. Generate 3-5 specific, actionable study recommendations.

Student Performance Analysis:
- Average Score: {average_score:.1f}%
- Performance Trend: {performance_trend}
- Weak Concepts: {', '.join(weak_concepts) if weak_concepts else 'None identified'}
- Strong Concepts: {', '.join(strong_concepts) if strong_concepts else 'None identified'}
- Total Quizzes Taken: {user_analysis.get('total_quizzes', 0)}

Guidelines:
1. Be specific and actionable
2. Consider the exam type ({exam_type.upper()}) requirements
3. Balance reinforcing strengths with addressing weaknesses
4. Include time management suggestions if needed
5. Keep recommendations under 50 words each

Generate 3-5 prioritized study recommendations:
"""

        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 512
            }
        )

        ai_response = getattr(response, "text", None) or str(response)

        # Parse AI response into individual recommendations
        recommendations = []
        lines = ai_response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and len(line) > 20:
                # Clean up numbering and formatting
                clean_line = line.lstrip('1234567890.-• ').strip()
                if clean_line:
                    recommendations.append(clean_line)

        return recommendations[:5]  # Return up to 5 recommendations

    except Exception as e:
        logging.warning(f"AI recommendation generation failed: {e}")
        return [
            "Take more practice quizzes to identify knowledge gaps",
            "Focus on reviewing fundamental concepts from weak areas",
            "Practice time management with timed quiz sessions"
        ]

def create_structured_recommendations(user_analysis: Dict[str, Any], ai_recommendations: List[str], exam_type: str) -> List[StudyRecommendation]:
    """Convert analysis into structured recommendations"""
    recommendations = []

    weak_concepts = user_analysis.get("weak_concepts", [])
    strong_concepts = user_analysis.get("strong_concepts", [])
    performance_trend = user_analysis.get("performance_trend", "no_data")
    average_score = user_analysis.get("average_score", 0)

    # Priority 1: Address critical weak concepts
    for i, weak_concept in enumerate(weak_concepts[:3]):
        concept_name = weak_concept["concept"]
        accuracy = weak_concept["accuracy"]

        recommendations.append(StudyRecommendation(
            type="concept_review",
            title=f"Master {concept_name}",
            description=f"Current accuracy: {accuracy:.0%}. Focus on understanding core principles and practice problems.",
            priority=5 - i,  # Highest priority for most problematic concepts
            action_type="tutor_chat",
            target_concept=concept_name,
            estimated_time_minutes=30,
            difficulty_level="review"
        ))

    # Priority 2: Leverage strong concepts for confidence
    if strong_concepts and average_score < 85:
        strongest = strong_concepts[0]
        recommendations.append(StudyRecommendation(
            type="practice_more",
            title=f"Advance Your {strongest['concept']} Skills",
            description=f"You excel here ({strongest['accuracy']:.0%} accuracy). Try harder problems to build confidence.",
            priority=3,
            action_type="quiz",
            target_concept=strongest["concept"],
            estimated_time_minutes=20,
            difficulty_level="advanced"
        ))

    # Priority 3: Performance trend adjustments
    if performance_trend == "declining":
        recommendations.append(StudyRecommendation(
            type="study_plan",
            title="Reverse Performance Decline",
            description="Recent scores are dropping. Take a step back, review fundamentals, and avoid cramming.",
            priority=4,
            action_type="concept_review",
            estimated_time_minutes=45,
            difficulty_level="foundation"
        ))
    elif performance_trend == "improving":
        recommendations.append(StudyRecommendation(
            type="difficulty_adjustment",
            title="Challenge Yourself Further",
            description="Great progress! Ready for harder questions to match exam standards.",
            priority=3,
            action_type="quiz",
            estimated_time_minutes=25,
            difficulty_level="exam_level"
        ))

    # Priority 4: AI-generated recommendations
    for i, ai_rec in enumerate(ai_recommendations[:2]):  # Take top 2 AI recommendations
        recommendations.append(StudyRecommendation(
            type="ai_suggestion",
            title=f"Smart Suggestion #{i+1}",
            description=ai_rec,
            priority=2,
            action_type="practice",
            estimated_time_minutes=20
        ))

    # Sort by priority
    recommendations.sort(key=lambda x: x.priority, reverse=True)

    return recommendations[:6]  # Return top 6 recommendations

@router.get("/api/suggestions/smart")
async def get_smart_suggestions(
    exam_type: Optional[str] = None,
    days_back: int = 30,
    user_id: str = Depends(get_current_user)
):
    """Generate smart study suggestions based on quiz performance and learning patterns"""
    try:
        supabase = get_supabase()

        # Get user's recent quiz results
        cutoff_date = (datetime.now() - timedelta(days=days_back)).isoformat()

        query = supabase.table("quiz_results").select("*").eq("user_id", user_id)
        if exam_type:
            query = query.eq("exam_type", exam_type)

        try:
            results = query.gte("completed_at", cutoff_date).order("completed_at", desc=True).execute()
            quiz_results = results.data or []
        except Exception as db_error:
            logging.warning(f"Database query failed: {db_error}")
            # Return new user recommendations if database query fails
            quiz_results = []

        if not quiz_results:
            # Return basic recommendations for new users
            return SmartSuggestionsResponse(
                recommendations=[
                    StudyRecommendation(
                        type="getting_started",
                        title="Take Your First Quiz",
                        description="Start with a practice quiz to help us understand your current level and provide personalized suggestions.",
                        priority=5,
                        action_type="quiz",
                        estimated_time_minutes=15,
                        difficulty_level="intermediate"
                    ),
                    StudyRecommendation(
                        type="getting_started",
                        title="Explore the AI Tutor",
                        description="Ask questions about specific concepts to get detailed explanations and guidance.",
                        priority=4,
                        action_type="tutor_chat",
                        estimated_time_minutes=10
                    )
                ],
                study_insights={
                    "message": "Take some quizzes to unlock personalized insights!",
                    "status": "new_user"
                },
                performance_summary={
                    "total_quizzes": 0,
                    "status": "Getting started"
                },
                next_best_actions=[
                    "Take a diagnostic quiz in your weakest subject",
                    "Ask the AI tutor to explain a concept you're unsure about"
                ]
            )

        # Analyze performance patterns
        user_analysis = analyze_quiz_performance(quiz_results)

        # Generate AI recommendations
        try:
            ai_recommendations = generate_ai_study_recommendations(
                user_analysis,
                exam_type or quiz_results[0].get("exam_type", "general")
            )
        except Exception as ai_error:
            logging.warning(f"AI recommendation generation failed: {ai_error}")
            ai_recommendations = [
                "Take more practice quizzes to identify knowledge gaps",
                "Focus on reviewing fundamental concepts from weak areas",
                "Practice time management with timed quiz sessions"
            ]

        # Create structured recommendations
        structured_recommendations = create_structured_recommendations(
            user_analysis,
            ai_recommendations,
            exam_type or quiz_results[0].get("exam_type", "general")
        )

        # Generate study insights
        study_insights = {
            "weak_areas_count": len(user_analysis["weak_concepts"]),
            "strong_areas_count": len(user_analysis["strong_concepts"]),
            "performance_trend": user_analysis["performance_trend"],
            "improvement_potential": "high" if user_analysis["average_score"] < 70 else "moderate" if user_analysis["average_score"] < 85 else "fine_tuning",
            "study_consistency": "regular" if len(quiz_results) >= 5 else "irregular"
        }

        # Generate next best actions
        next_actions = []
        if user_analysis["weak_concepts"]:
            next_actions.append(f"Focus on {user_analysis['weak_concepts'][0]['concept']} - your biggest opportunity")
        if user_analysis["average_score"] < 60:
            next_actions.append("Review fundamental concepts before attempting harder problems")
        elif user_analysis["average_score"] > 80:
            next_actions.append("Challenge yourself with exam-level difficulty questions")

        if len(next_actions) == 0:
            next_actions.append("Continue regular practice to maintain your momentum")

        return SmartSuggestionsResponse(
            recommendations=structured_recommendations,
            study_insights=study_insights,
            performance_summary={
                "total_quizzes": user_analysis["total_quizzes"],
                "average_score": round(user_analysis["average_score"], 1),
                "performance_trend": user_analysis["performance_trend"],
                "time_efficiency": round(user_analysis["average_time_efficiency"], 2)
            },
            next_best_actions=next_actions
        )

    except Exception as e:
        logging.exception("Failed to generate smart suggestions")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {e}")

@router.get("/api/suggestions/chapter/{chapter_id}")
async def get_chapter_specific_suggestions(
    chapter_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get suggestions specific to a chapter based on user's performance in that chapter"""
    try:
        supabase = get_supabase()

        # Get quiz results for this specific chapter
        try:
            results = supabase.table("quiz_results") \
                .select("*") \
                .eq("user_id", user_id) \
                .ilike("chapter_name", f"%{chapter_id.replace('-', ' ')}%") \
                .order("completed_at", desc=True) \
                .limit(10) \
                .execute()

            chapter_results = results.data or []
        except Exception as db_error:
            logging.warning(f"Chapter results query failed: {db_error}")
            chapter_results = []

        if not chapter_results:
            return {
                "suggestions": [
                    {
                        "type": "first_attempt",
                        "title": "Take Your First Quiz",
                        "description": "Start with a practice quiz for this chapter to see where you stand.",
                        "action": "quiz"
                    },
                    {
                        "type": "exploration",
                        "title": "Ask the AI Tutor",
                        "description": "Explore key concepts by asking specific questions about this chapter.",
                        "action": "tutor_chat"
                    }
                ],
                "chapter_insights": {
                    "status": "unexplored",
                    "recommendation": "Start with fundamentals"
                }
            }

        # Analyze chapter-specific performance
        latest_result = chapter_results[0]
        average_score = sum(r["score"] / r["total_questions"] * 100 for r in chapter_results) / len(chapter_results)

        suggestions = []

        if average_score < 60:
            suggestions.append({
                "type": "concept_review",
                "title": "Master the Fundamentals",
                "description": f"Your average score is {average_score:.0f}%. Focus on understanding basic concepts first.",
                "action": "tutor_chat",
                "priority": "high"
            })
        elif average_score < 80:
            suggestions.append({
                "type": "practice_more",
                "title": "Practice More Problems",
                "description": f"Good progress at {average_score:.0f}%! More practice will help you achieve mastery.",
                "action": "quiz",
                "priority": "medium"
            })
        else:
            suggestions.append({
                "type": "challenge",
                "title": "Challenge Yourself",
                "description": f"Excellent work at {average_score:.0f}%! Try harder difficulty levels.",
                "action": "quiz",
                "priority": "low"
            })

        # Add concept-specific suggestions
        if latest_result.get("concepts_needing_work"):
            for concept in latest_result["concepts_needing_work"][:2]:
                suggestions.append({
                    "type": "concept_focus",
                    "title": f"Focus on {concept}",
                    "description": f"This concept appeared in your areas needing improvement.",
                    "action": "tutor_chat",
                    "target_concept": concept,
                    "priority": "high"
                })

        return {
            "suggestions": suggestions,
            "chapter_insights": {
                "attempts": len(chapter_results),
                "average_score": round(average_score, 1),
                "last_attempt": latest_result["completed_at"],
                "status": "needs_work" if average_score < 70 else "progressing" if average_score < 85 else "mastered"
            }
        }

    except Exception as e:
        logging.exception("Failed to generate chapter suggestions")
        raise HTTPException(status_code=500, detail=f"Failed to generate chapter suggestions: {e}")