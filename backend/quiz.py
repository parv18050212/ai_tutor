# quiz.py
import os
from typing import Optional, List, Callable
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
from supabase import Client
import google.generativeai as genai

# Import dependencies that will be passed from main
router = APIRouter()

# Import the authentication function
from auth import get_current_user

# Models
class QuizGenerationRequest(BaseModel):
    chapter_id: str
    exam_type: str  # "jee", "cuet", "neet", "bitsat", "state"
    exam_name: str
    subject_name: str
    chapter_name: str
    difficulty_level: str = "intermediate"  # "foundation", "intermediate", "advanced", "exam_level"
    question_count: int = 5
    accessibility_needs: Optional[List[str]] = []
    reading_level: str = "high"  # "elementary", "middle", "high", "college"
    time_limit_per_question: Optional[int] = None

class QuizQuestion(BaseModel):
    id: str
    text: str
    options: List[str]
    correct_answer: int
    hint: str
    explanation: str
    difficulty_level: str
    question_type: str  # "numerical", "conceptual", "application", "factual"
    time_estimate: int  # seconds

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    exam_type: str
    difficulty_level: str
    total_estimated_time: int
    recommendations: Optional[str] = None

class QuizResult(BaseModel):
    quiz_id: str
    user_id: str
    exam_type: str
    subject_name: str
    chapter_name: str
    difficulty_level: str
    score: int
    total_questions: int
    time_taken: int
    concepts_mastered: Optional[List[str]] = []
    concepts_needing_work: Optional[List[str]] = []
    exam_readiness_score: Optional[float] = 0.0
    recommended_next_difficulty: Optional[str] = "intermediate"

# Configuration
EXAM_DIFFICULTY_MAPPING = {
    "jee": {
        "complexity": "very_high",
        "steps": "multi_step",
        "numerical": "precise_calculation",
        "conceptual_depth": "advanced",
        "trap_answers": True,
        "time_per_question": 120,  # seconds
        "question_distribution": {"numerical": 40, "conceptual": 40, "application": 20}
    },
    "cuet": {
        "complexity": "moderate",
        "steps": "direct_application",
        "numerical": "basic_calculation",
        "conceptual_depth": "fundamental",
        "trap_answers": False,
        "time_per_question": 90,
        "question_distribution": {"numerical": 20, "factual": 50, "application": 30}
    },
}

# Global dependencies - will be set during initialization
_supabase: Optional[Client] = None
_auth_dependency: Optional[Callable] = None

def init_quiz_module(supabase_client: Client, auth_dependency: Callable):
    """Initialize the quiz module with dependencies from main.py"""
    global _supabase, _auth_dependency
    _supabase = supabase_client
    _auth_dependency = auth_dependency

def get_supabase() -> Client:
    """Get the initialized Supabase client"""
    if _supabase is None:
        raise HTTPException(status_code=500, detail="Quiz module not properly initialized")
    return _supabase

# Removed get_auth_dependency - using get_current_user directly

async def resolve_subject_name(subject_id: str, supabase: Client) -> str:
    """Resolve subject ID to actual subject name"""
    try:
        result = supabase.table("subjects").select("name").eq("id", subject_id).single().execute()
        if result.data:
            return result.data["name"]
    except Exception as e:
        logging.warning(f"Failed to resolve subject ID {subject_id}: {e}")

    # Fallback to ID if lookup fails
    return subject_id.replace("-", " ").title()

async def resolve_chapter_name(chapter_id: str, supabase: Client) -> str:
    """Resolve chapter ID to actual chapter name"""
    try:
        result = supabase.table("chapters").select("name").eq("id", chapter_id).single().execute()
        if result.data:
            return result.data["name"]
    except Exception as e:
        logging.warning(f"Failed to resolve chapter ID {chapter_id}: {e}")

    # Fallback to ID if lookup fails
    return chapter_id.replace("-", " ").title()

def get_exam_specific_quiz_prompt(exam_type: str, subject_name: str, chapter_name: str, difficulty_level: str, question_count: int, accessibility_needs: List[str], reading_level: str):
    """Generate exam-specific quiz generation prompt"""

    exam_config = EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING["cuet"])

    # Base accessibility adaptations
    accessibility_instructions = ""
    if "dyslexia" in accessibility_needs:
        accessibility_instructions += "- Use clear, simple sentence structure. Avoid complex words when simple ones work.\n"
    if "adhd" in accessibility_needs:
        accessibility_instructions += "- Keep questions focused and direct. Avoid lengthy stems.\n"
    if "visual_impairment" in accessibility_needs:
        accessibility_instructions += "- Describe any visual concepts clearly in text. Avoid diagram-dependent questions.\n"
    if "cognitive" in accessibility_needs:
        accessibility_instructions += "- Use concrete examples. Break complex concepts into simpler parts.\n"

    # Reading level adaptations
    language_complexity = {
        "elementary": "Use simple words (grade 6-8 level). Keep sentences short and direct.",
        "middle": "Use clear language (grade 9-10 level). Explain technical terms when first used.",
        "high": "Use standard academic language (grade 11-12 level) with clear explanations.",
        "college": "Use advanced academic vocabulary appropriate for the subject."
    }.get(reading_level, "Use standard academic language with clear explanations.")

    if exam_type.lower() == "jee":
        return f"""
You are an expert JEE question generator. Create {question_count} HIGH-DIFFICULTY multiple choice questions for {chapter_name} SPECIFICALLY in {subject_name}.

**CRITICAL: ALL QUESTIONS MUST BE STRICTLY {subject_name.upper()} QUESTIONS. DO NOT include questions from other subjects like Physics, Chemistry, or Mathematics unless that is the specified subject.**

**JEE Question Standards:**
- **Difficulty Level: VERY HIGH** - Requires deep conceptual understanding and problem-solving skills
- **Multi-step reasoning** - Questions should require 2-3 logical steps to solve
- **Conceptual depth** - Test understanding of fundamental principles, not just memorization
- **Numerical precision** - Include calculations that require careful attention to significant figures
- **Trap answers** - Include plausible wrong options that catch common mistakes
- **Time pressure** - Each question should take 2-3 minutes for a well-prepared student

**Question Type Distribution:**
- {exam_config['question_distribution']['numerical']}% Numerical problem-solving questions
- {exam_config['question_distribution']['conceptual']}% Conceptual understanding questions
- {exam_config['question_distribution']['application']}% Real-world application questions

**Language & Accessibility Requirements:**
{language_complexity}
{accessibility_instructions}

**Question Format for Each Question:**
1. **Question stem**: Clear, specific scenario requiring deep analysis
2. **4 options**: One correct, three plausible distractors including common errors
3. **Hint**: Guide toward the approach/method without giving steps away
4. **Explanation**: Show complete solution with reasoning at JEE level
5. **Difficulty assessment**: Confirm this is JEE Advanced level complexity

**Context from course material:**
{{context}}

**Important**: These questions should be challenging enough for JEE Advanced while remaining accessible given the student's needs. Focus on testing deep understanding rather than trick questions.

Generate {question_count} JEE-level questions now.
"""

    elif exam_type.lower() == "cuet":
        return f"""
You are an expert CUET question generator. Create {question_count} MODERATE-DIFFICULTY multiple choice questions for {chapter_name} SPECIFICALLY in {subject_name}.

**CRITICAL: ALL QUESTIONS MUST BE STRICTLY {subject_name.upper()} QUESTIONS. DO NOT include questions from other subjects unless that is the specified subject.**

**CUET Question Standards:**
- **Difficulty Level: MODERATE** - Based on NCERT textbook knowledge
- **Direct application** - Straightforward use of concepts learned
- **NCERT alignment** - Questions should be answerable with standard textbook knowledge
- **Clear and unambiguous** - No trick questions or overly complex scenarios
- **Factual accuracy** - Test both recall and basic understanding

**Question Type Distribution:**
- {exam_config['question_distribution']['numerical']}% Basic numerical problems
- {exam_config['question_distribution']['factual']}% Factual recall and definition-based questions
- {exam_config['question_distribution']['application']}% Direct application of concepts

**Language & Accessibility Requirements:**
{language_complexity}
{accessibility_instructions}

**Question Format for Each Question:**
1. **Question stem**: Clear, direct question based on NCERT concepts
2. **4 options**: One correct, three reasonable distractors
3. **Hint**: Reference relevant NCERT content or key concept
4. **Explanation**: Clear explanation with NCERT textbook reference where applicable
5. **Difficulty assessment**: Confirm this matches NCERT/CUET level

**Context from course material:**
{{context}}

**Important**: Questions should test understanding at NCERT level. Avoid JEE-style complexity while ensuring conceptual clarity.

Generate {question_count} CUET-level questions now.
"""

    elif exam_type.lower() == "neet":
        return f"""
You are an expert NEET question generator. Create {question_count} HIGH-DIFFICULTY multiple choice questions for {chapter_name} in {subject_name}.

**NEET Question Standards:**
- **Difficulty Level: HIGH** - Detailed understanding with application focus
- **Biology emphasis** - Include biological applications and medical relevance where applicable
- **Diagram understanding** - Test interpretation of biological processes and structures
- **Application-based** - Connect concepts to real biological scenarios
- **Precise terminology** - Use correct scientific terminology consistently

**Question Type Distribution:**
- {exam_config['question_distribution']['numerical']}% Numerical calculations and measurements
- {exam_config['question_distribution']['factual']}% Factual recall with biological detail
- {exam_config['question_distribution']['application']}% Application to biological systems

**Language & Accessibility Requirements:**
{language_complexity}
{accessibility_instructions}

**Question Format for Each Question:**
1. **Question stem**: Biologically relevant scenario or direct concept question
2. **4 options**: One correct, three plausible alternatives including common misconceptions
3. **Hint**: Focus on key biological facts or processes
4. **Explanation**: Detailed biological explanation with mechanism where relevant
5. **Difficulty assessment**: Confirm this matches NEET level complexity

**Context from course material:**
{{context}}

**Important**: Questions should test detailed understanding with medical/biological applications. Focus on accuracy and biological relevance.

Generate {question_count} NEET-level questions now.
"""

    else:  # Default to moderate difficulty for other exams
        return f"""
You are an expert question generator. Create {question_count} MODERATE-DIFFICULTY multiple choice questions for {chapter_name} in {subject_name}.

**Question Standards:**
- **Difficulty Level: MODERATE** - Good understanding with some application
- **Clear concepts** - Test fundamental understanding
- **Balanced approach** - Mix of recall, understanding, and application

**Language & Accessibility Requirements:**
{language_complexity}
{accessibility_instructions}

**Question Format for Each Question:**
1. **Question stem**: Clear, focused question
2. **4 options**: One correct, three reasonable distractors
3. **Hint**: Helpful guidance toward the concept
4. **Explanation**: Clear reasoning and solution
5. **Difficulty assessment**: Appropriate for {exam_type.upper()} level

**Context from course material:**
{{context}}

Generate {question_count} questions now.
"""

def parse_ai_quiz_response(ai_response: str, exam_type: str, difficulty: str) -> List[QuizQuestion]:
    """Parse AI response into structured quiz questions"""
    questions = []

    # Log the AI response for debugging
    logging.info(f"Parsing AI response for {exam_type} quiz: {ai_response[:500]}...")

    try:
        # Try multiple parsing strategies
        questions = try_parse_numbered_questions(ai_response, exam_type, difficulty)

        if not questions:
            questions = try_parse_markdown_questions(ai_response, exam_type, difficulty)

        if not questions:
            logging.warning("All parsing strategies failed, using fallback questions")
            questions = create_fallback_questions(exam_type, difficulty)

        logging.info(f"Successfully parsed {len(questions)} questions")
        for i, q in enumerate(questions):
            logging.debug(f"Question {i+1}: {q.text[:100]}... with {len(q.options)} options")

    except Exception as e:
        logging.exception("Failed to parse AI quiz response")
        questions = create_fallback_questions(exam_type, difficulty)

    return questions

def try_parse_numbered_questions(ai_response: str, exam_type: str, difficulty: str) -> List[QuizQuestion]:
    """Try to parse questions with numbered format"""
    questions = []
    exam_config = EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING["cuet"])

    # Split by question numbers or headers
    sections = ai_response.split("Question")

    for i, section in enumerate(sections[1:], 1):  # Skip first empty section
        if len(section.strip()) < 50:  # Skip very short sections
            continue

        try:
            # Extract question components
            lines = [line.strip() for line in section.split('\n') if line.strip()]

            question_text = ""
            options = []
            hint = ""
            explanation = ""
            correct_answer = 0

            current_section = "question"

            for line in lines:
                if line.lower().startswith(('a)', 'b)', 'c)', 'd)')):
                    if current_section == "question":
                        current_section = "options"
                    options.append(line[2:].strip())
                elif line.lower().startswith(('a.', 'b.', 'c.', 'd.')):
                    if current_section == "question":
                        current_section = "options"
                    options.append(line[2:].strip())
                elif "answer:" in line.lower() or "correct:" in line.lower():
                    # Extract correct answer
                    answer_line = line.lower()
                    if "a)" in answer_line or " a" in answer_line or answer_line.endswith("a"):
                        correct_answer = 0
                    elif "b)" in answer_line or " b" in answer_line or answer_line.endswith("b"):
                        correct_answer = 1
                    elif "c)" in answer_line or " c" in answer_line or answer_line.endswith("c"):
                        correct_answer = 2
                    elif "d)" in answer_line or " d" in answer_line or answer_line.endswith("d"):
                        correct_answer = 3
                elif "hint:" in line.lower():
                    current_section = "hint"
                    hint = line[line.lower().find("hint:") + 5:].strip()
                elif "explanation:" in line.lower():
                    current_section = "explanation"
                    explanation = line[line.lower().find("explanation:") + 12:].strip()
                elif current_section == "question" and not line.startswith(('a)', 'b)', 'c)', 'd)', 'a.', 'b.', 'c.', 'd.')):
                    question_text += " " + line
                elif current_section == "hint":
                    hint += " " + line
                elif current_section == "explanation":
                    explanation += " " + line

            # Clean up question text
            question_text = question_text.strip()
            if question_text.startswith(f"{i}:") or question_text.startswith(f"{i}."):
                question_text = question_text[2:].strip()

            # Ensure we have at least 4 options
            while len(options) < 4:
                options.append(f"Option {chr(65 + len(options))}")

            if question_text and len(options) >= 4:
                questions.append(QuizQuestion(
                    id=f"q_{i}_{uuid.uuid4().hex[:8]}",
                    text=question_text,
                    options=options[:4],  # Only take first 4 options
                    correct_answer=correct_answer,
                    hint=hint or "Think about the fundamental concepts involved.",
                    explanation=explanation or "Refer to the course material for detailed explanation.",
                    difficulty_level=difficulty,
                    question_type="conceptual",
                    time_estimate=exam_config["time_per_question"]
                ))

        except Exception as e:
            logging.warning(f"Failed to parse question {i}: {e}")
            continue

    return questions

def try_parse_markdown_questions(ai_response: str, exam_type: str, difficulty: str) -> List[QuizQuestion]:
    """Try to parse questions with markdown-style format"""
    questions = []
    exam_config = EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING["cuet"])

    # Try to split by markdown headers or numbered lists
    import re

    # Look for patterns like "1." or "Question 1" or "## Question"
    question_pattern = r'(?:^|\n)(?:\d+\.|\*\*Question \d+\*\*|## Question|\d+\))'
    question_splits = re.split(question_pattern, ai_response)

    for i, section in enumerate(question_splits[1:], 1):  # Skip first section
        if len(section.strip()) < 30:
            continue

        try:
            lines = [line.strip() for line in section.split('\n') if line.strip()]

            question_text = ""
            options = []

            for line in lines:
                if re.match(r'^[A-D][\)\.]\s*', line):
                    # Extract option text after A) or A.
                    option_text = re.sub(r'^[A-D][\)\.]\s*', '', line).strip()
                    options.append(option_text)
                elif not options and line:  # Question text before options
                    question_text += " " + line

            question_text = question_text.strip()

            # Ensure we have enough options
            while len(options) < 4:
                options.append(f"Option {chr(65 + len(options))}")

            if question_text and len(options) >= 4:
                questions.append(QuizQuestion(
                    id=f"q_{i}_{uuid.uuid4().hex[:8]}",
                    text=question_text,
                    options=options[:4],
                    correct_answer=0,  # Default to first option
                    hint="Think about the fundamental concepts involved.",
                    explanation="Refer to the course material for detailed explanation.",
                    difficulty_level=difficulty,
                    question_type="conceptual",
                    time_estimate=exam_config["time_per_question"]
                ))

        except Exception as e:
            logging.warning(f"Failed to parse markdown question {i}: {e}")
            continue

    return questions

def create_fallback_questions(exam_type: str, difficulty: str) -> List[QuizQuestion]:
    """Create fallback questions when AI parsing fails"""
    exam_config = EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING["cuet"])

    return [
        QuizQuestion(
            id=f"fallback_{i}_{uuid.uuid4().hex[:8]}",
            text=f"Sample {exam_type.upper()} question {i}: This is a placeholder question for testing the quiz system.",
            options=[
                "Option A - First choice",
                "Option B - Second choice",
                "Option C - Third choice",
                "Option D - Fourth choice"
            ],
            correct_answer=0,
            hint="This is a sample hint for the fallback question.",
            explanation="This is a sample explanation. In a real quiz, this would contain the detailed solution.",
            difficulty_level=difficulty,
            question_type="conceptual",
            time_estimate=exam_config["time_per_question"]
        )
        for i in range(1, 6)  # Create 5 fallback questions
    ]

def generate_quiz_recommendations(exam_type: str, difficulty: str, question_count: int, accessibility_needs: List[str]) -> str:
    """Generate personalized recommendations for the quiz"""
    recommendations = []

    if exam_type.lower() == "jee":
        recommendations.append("🎯 This is JEE-level difficulty. Take your time to understand each concept deeply.")
        recommendations.append("💡 Focus on the reasoning process, not just the final answer.")
    elif exam_type.lower() == "cuet":
        recommendations.append("📚 These questions are NCERT-based. Refer back to your textbook if needed.")
        recommendations.append("✅ Practice direct application of concepts you've learned.")
    elif exam_type.lower() == "neet":
        recommendations.append("🔬 Pay attention to biological applications and medical relevance.")
        recommendations.append("📊 Focus on understanding processes and mechanisms.")

    if "dyslexia" in accessibility_needs:
        recommendations.append("📖 Take extra time to read each question carefully.")
    if "adhd" in accessibility_needs:
        recommendations.append("⏱️ Feel free to take breaks between questions if needed.")
    if "visual_impairment" in accessibility_needs:
        recommendations.append("🔊 Use the text-to-speech feature for better comprehension.")

    recommendations.append(f"⌚ Estimated time: {question_count * EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING['cuet'])['time_per_question']} seconds")

    return " | ".join(recommendations)

def calculate_exam_readiness_score(quiz_result: QuizResult) -> float:
    """Calculate how ready the student is for their target exam"""
    base_score = (quiz_result.score / quiz_result.total_questions) * 100

    # Adjust based on exam type difficulty
    exam_multipliers = {
        "jee": 1.2,  # JEE performance weighted higher
        "cuet": 1.0,
        "neet": 1.1,
        "bitsat": 1.15
    }

    multiplier = exam_multipliers.get(quiz_result.exam_type.lower(), 1.0)

    # Adjust based on difficulty level
    difficulty_adjustments = {
        "foundation": 0.7,
        "intermediate": 1.0,
        "advanced": 1.3,
        "exam_level": 1.5
    }

    difficulty_adj = difficulty_adjustments.get(quiz_result.difficulty_level, 1.0)

    # Consider time efficiency (bonus for completing quickly)
    expected_time = quiz_result.total_questions * EXAM_DIFFICULTY_MAPPING.get(quiz_result.exam_type.lower(), EXAM_DIFFICULTY_MAPPING["cuet"])["time_per_question"]
    time_efficiency = min(1.2, expected_time / max(quiz_result.time_taken, 1))

    final_score = min(100, base_score * multiplier * difficulty_adj * time_efficiency)
    return round(final_score, 2)

def determine_next_difficulty(quiz_result: QuizResult) -> str:
    """Determine the recommended difficulty for the next quiz"""
    score_percentage = (quiz_result.score / quiz_result.total_questions) * 100

    current_difficulty = quiz_result.difficulty_level

    # Progression logic
    if score_percentage >= 85:
        # Excellent performance - move up
        difficulty_progression = {
            "foundation": "intermediate",
            "intermediate": "advanced",
            "advanced": "exam_level",
            "exam_level": "exam_level"  # Stay at exam level
        }
        return difficulty_progression.get(current_difficulty, "intermediate")

    elif score_percentage >= 70:
        # Good performance - stay at current level or slight increase
        if current_difficulty == "foundation":
            return "intermediate"
        return current_difficulty

    elif score_percentage >= 50:
        # Average performance - stay at current level
        return current_difficulty

    else:
        # Below average - might need to go back to basics
        difficulty_regression = {
            "exam_level": "advanced",
            "advanced": "intermediate",
            "intermediate": "foundation",
            "foundation": "foundation"  # Stay at foundation
        }
        return difficulty_regression.get(current_difficulty, "foundation")

def generate_performance_insights(quiz_result: QuizResult) -> str:
    """Generate personalized insights based on quiz performance"""
    score_percentage = (quiz_result.score / quiz_result.total_questions) * 100
    insights = []

    # Performance-based insights
    if score_percentage >= 90:
        insights.append("🎉 Excellent performance! You're demonstrating strong mastery of this chapter.")
    elif score_percentage >= 75:
        insights.append("👏 Good job! You have a solid understanding with room for minor improvements.")
    elif score_percentage >= 60:
        insights.append("📚 Decent progress! Focus on the concepts you missed to strengthen your understanding.")
    else:
        insights.append("💪 Keep practicing! Consider reviewing the fundamental concepts before attempting more questions.")

    # Exam-specific insights
    if quiz_result.exam_type.lower() == "jee":
        if score_percentage >= 75:
            insights.append("🎯 You're developing good problem-solving skills for JEE-level questions.")
        else:
            insights.append("⚡ JEE requires deep conceptual understanding. Focus on the 'why' behind each solution.")

    elif quiz_result.exam_type.lower() == "cuet":
        if score_percentage >= 80:
            insights.append("📖 Your NCERT concepts are solid! Keep practicing to build confidence.")
        else:
            insights.append("📚 Review your NCERT textbook chapters - CUET questions are directly based on them.")

    # Concept-specific insights
    if quiz_result.concepts_needing_work:
        insights.append(f"🔍 Focus areas: {', '.join(quiz_result.concepts_needing_work[:3])}")

    if quiz_result.concepts_mastered:
        insights.append(f"✅ Strengths: {', '.join(quiz_result.concepts_mastered[:3])}")

    return " | ".join(insights)

# Endpoints
@router.get("/api/quiz/generate")
async def generate_quiz(
    chapter: str,
    exam_type: str = "cuet",
    n: int = 5,
    difficulty: str = "intermediate",
    reading_level: str = "high",
    accessibility_needs: str = "",
    subject: str = "physics",  # Add subject parameter
    user_id: str = Depends(get_current_user)
):
    """Generate quiz questions based on exam type and chapter content"""
    try:
        supabase = get_supabase()

        # Parse accessibility needs
        accessibility_list = [need.strip() for need in accessibility_needs.split(",") if need.strip()] if accessibility_needs else []

        # Get chapter information (you may need to adjust this based on your data structure)
        chapter_id = chapter

        # Resolve subject and chapter IDs to actual names
        exam_name = exam_type.upper()
        subject_name = await resolve_subject_name(subject, supabase)
        chapter_name = await resolve_chapter_name(chapter, supabase)

        logging.info(f"Generating quiz for {subject_name} - {chapter_name} ({exam_type}) [Subject ID: {subject}, Chapter ID: {chapter}]")

        # Generate embedding for chapter context with subject-specific keywords
        search_query = f"{subject_name} {chapter_name} {exam_type} concepts problems questions theory"
        try:
            embedding_resp = genai.embed_content(
                model="models/text-embedding-004",
                content=search_query,
                task_type="RETRIEVAL_QUERY"
            )
            question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']
        except Exception as e:
            # Fallback to older model
            embedding_resp = genai.embed_content(
                model="models/embedding-001",
                content=search_query,
                task_type="RETRIEVAL_QUERY"
            )
            question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']

        # Get relevant course content
        matching_chunks = supabase.rpc("match_chunks", {
            "query_embedding": question_embedding,
            "match_threshold": 0.2,  # Lower threshold for more content
            "match_count": 10  # More content for comprehensive questions
        }).execute()

        chunks = matching_chunks.data or []
        context = "\n\n".join([c.get("content", "") for c in chunks])

        if not context.strip():
            context = f"Basic concepts and principles related to {chapter_name} in {subject_name}. Focus on {subject_name} theory, formulas, and problem-solving techniques."

        logging.info(f"Retrieved context length: {len(context)} characters for {subject_name} {chapter_name}")

        # Generate quiz prompt
        quiz_prompt = get_exam_specific_quiz_prompt(
            exam_type, subject_name, chapter_name, difficulty, n, accessibility_list, reading_level
        )

        # Format the prompt with context
        final_prompt = quiz_prompt.format(context=context)

        # Call AI to generate questions
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(
            final_prompt,
            generation_config={
                "temperature": 0.3,  # Slightly higher for variety
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048  # More tokens for multiple questions
            }
        )

        ai_response = getattr(response, "text", None) or (response.get("content") if isinstance(response, dict) else str(response))

        # Parse the AI response into structured questions
        # This is a simplified parser - you may want to make it more robust
        questions = parse_ai_quiz_response(ai_response, exam_type, difficulty)

        # Calculate total estimated time
        exam_config = EXAM_DIFFICULTY_MAPPING.get(exam_type, EXAM_DIFFICULTY_MAPPING["cuet"])
        total_time = len(questions) * exam_config["time_per_question"]

        # Generate recommendations
        recommendations = generate_quiz_recommendations(exam_type, difficulty, len(questions), accessibility_list)

        return QuizResponse(
            questions=questions,
            exam_type=exam_type,
            difficulty_level=difficulty,
            total_estimated_time=total_time,
            recommendations=recommendations
        )

    except Exception as e:
        logging.exception("Failed to generate quiz")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {e}")

@router.post("/api/quiz/submit")
async def submit_quiz_result(
    quiz_result: QuizResult,
    user_id: str = Depends(get_current_user)
):
    """Submit and store quiz results with analytics"""
    try:
        supabase = get_supabase()

        # Log the incoming quiz result for debugging
        logging.info(f"Submitting quiz result for user {user_id}: {quiz_result.quiz_id}")
        logging.info(f"Quiz result data: {quiz_result.dict()}")

        # Ensure the user_id matches
        quiz_result.user_id = user_id

        # Ensure lists are not None (model defaults should handle this)
        if quiz_result.concepts_mastered is None:
            quiz_result.concepts_mastered = []
        if quiz_result.concepts_needing_work is None:
            quiz_result.concepts_needing_work = []

        # Calculate exam readiness score based on performance
        readiness_score = calculate_exam_readiness_score(quiz_result)
        quiz_result.exam_readiness_score = readiness_score

        # Determine recommended next difficulty
        quiz_result.recommended_next_difficulty = determine_next_difficulty(quiz_result)

        # Store quiz result in database
        quiz_data = {
            "id": quiz_result.quiz_id,
            "user_id": user_id,
            "exam_type": quiz_result.exam_type,
            "subject_name": quiz_result.subject_name,
            "chapter_name": quiz_result.chapter_name,
            "difficulty_level": quiz_result.difficulty_level,
            "score": quiz_result.score,
            "total_questions": quiz_result.total_questions,
            "time_taken": quiz_result.time_taken,
            "concepts_mastered": quiz_result.concepts_mastered or [],
            "concepts_needing_work": quiz_result.concepts_needing_work or [],
            "exam_readiness_score": quiz_result.exam_readiness_score,
            "recommended_next_difficulty": quiz_result.recommended_next_difficulty,
            "completed_at": datetime.now().isoformat()
        }

        logging.info(f"Inserting quiz data: {quiz_data}")

        try:
            result = supabase.table("quiz_results").insert(quiz_data).execute()
            logging.info(f"Quiz result inserted successfully: {result.data}")
        except Exception as db_error:
            logging.error(f"Database insertion failed: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")

        performance_insights = generate_performance_insights(quiz_result)

        return {
            "message": "Quiz result submitted successfully",
            "exam_readiness_score": readiness_score,
            "recommended_next_difficulty": quiz_result.recommended_next_difficulty,
            "performance_insights": performance_insights
        }

    except HTTPException:
        raise
    except ValueError as e:
        logging.error(f"Quiz result validation error: {e}")
        logging.error(f"Quiz result data that failed validation: {quiz_result.dict() if 'quiz_result' in locals() else 'N/A'}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except Exception as e:
        logging.exception("Failed to submit quiz result")
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz result: {str(e)}")

@router.get("/api/quiz/analytics/{user_id}")
async def get_quiz_analytics(
    user_id: str,  # Fixed: parameter name now matches path parameter
    exam_type: Optional[str] = None,
    days: int = 30,
    current_user_id: str = Depends(get_current_user)
):
    """Get quiz performance analytics for a user"""

    supabase = get_supabase()

    # For now, users can only view their own analytics
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Can only view your own analytics")

    try:
        # Build query
        query = supabase.table("quiz_results").select("*").eq("user_id", current_user_id)

        if exam_type:
            query = query.eq("exam_type", exam_type)

        # Get recent results
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        try:
            results = query.gte("completed_at", cutoff_date).order("completed_at", desc=True).execute()
            quiz_data = results.data or []
        except Exception as db_error:
            logging.warning(f"Quiz analytics query failed: {db_error}")
            quiz_data = []

        # Calculate analytics
        analytics = {
            "total_quizzes": len(quiz_data),
            "average_score": 0,
            "average_readiness_score": 0,
            "improvement_trend": "stable",
            "strong_subjects": [],
            "weak_subjects": [],
            "exam_readiness": {},
            "recent_performance": []
        }

        if quiz_data:
            scores = [q["score"] / q["total_questions"] * 100 for q in quiz_data]
            readiness_scores = [q["exam_readiness_score"] for q in quiz_data]

            analytics["average_score"] = round(sum(scores) / len(scores), 2)
            analytics["average_readiness_score"] = round(sum(readiness_scores) / len(readiness_scores), 2)

            # Calculate improvement trend
            if len(scores) >= 3:
                recent_avg = sum(scores[:3]) / 3
                older_avg = sum(scores[-3:]) / 3
                if recent_avg > older_avg + 5:
                    analytics["improvement_trend"] = "improving"
                elif recent_avg < older_avg - 5:
                    analytics["improvement_trend"] = "declining"

            # Subject analysis
            subject_performance = {}
            for quiz in quiz_data:
                subject = quiz["subject_name"]
                if subject not in subject_performance:
                    subject_performance[subject] = []
                subject_performance[subject].append(quiz["score"] / quiz["total_questions"] * 100)

            for subject, scores in subject_performance.items():
                avg = sum(scores) / len(scores)
                if avg >= 80:
                    analytics["strong_subjects"].append({"subject": subject, "average": round(avg, 2)})
                elif avg < 60:
                    analytics["weak_subjects"].append({"subject": subject, "average": round(avg, 2)})

            # Exam readiness by type
            exam_performance = {}
            for quiz in quiz_data:
                exam = quiz["exam_type"]
                if exam not in exam_performance:
                    exam_performance[exam] = []
                exam_performance[exam].append(quiz["exam_readiness_score"])

            for exam, scores in exam_performance.items():
                analytics["exam_readiness"][exam] = {
                    "average_readiness": round(sum(scores) / len(scores), 2),
                    "quiz_count": len(scores)
                }

            # Recent performance
            analytics["recent_performance"] = [
                {
                    "date": q["completed_at"],
                    "score": q["score"],
                    "total": q["total_questions"],
                    "exam_type": q["exam_type"],
                    "difficulty": q["difficulty_level"]
                }
                for q in quiz_data[:10]  # Last 10 quizzes
            ]

        return analytics

    except Exception as e:
        logging.exception("Failed to get quiz analytics")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {e}")