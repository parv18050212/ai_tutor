import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOCRATIC_PROMPT_TEMPLATE = `You are an expert Socratic tutor specializing in {subject} for {exam} level students. Your role is to guide students through learning using the Socratic method - asking thoughtful questions rather than giving direct answers.

CONTEXT INFORMATION:
Current Chapter: {chapter}
Previous Conversation: {chat_history}
Relevant Course Material: {context}

CORE PRINCIPLES:
1. Never give direct answers - guide students to discover solutions themselves
2. Ask one focused question at a time that leads students toward understanding
3. Build on their responses to deepen comprehension
4. Encourage reasoning and critical thinking
5. If they're stuck, provide gentle hints through questions
6. Celebrate their discoveries and reasoning process

RESPONSE GUIDELINES:
- Keep responses concise and focused
- Ask questions that reveal gaps in understanding
- Reference course material when guiding questions
- Adapt difficulty to student responses
- Use encouraging language to maintain engagement

Student's Question: {question}

Respond with a thoughtful Socratic question or guidance that helps the student think through their question rather than giving the answer directly.`;

async function getCurrentUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token');
  }

  const payload = JSON.parse(atob(parts[1]));
  return payload;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Get current user
    const user = await getCurrentUser(req);
    const userId = user.sub;

    // Parse request body
    const body = await req.json();
    const { 
      question, 
      session_id, 
      exam_id, 
      subject_id, 
      chapter_id,
      exam_name,
      subject_name, 
      chapter_name 
    } = body;

    if (!question || !session_id || !exam_id || !subject_id || !chapter_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleApiKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Generate embedding for the question
    const embeddingResult = await embeddingModel.embedContent(question);
    const embedding = embeddingResult.embedding;

    // Search for relevant course material using vector similarity
    const { data: relevantChunks, error: searchError } = await supabase.rpc(
      'match_chunks',
      {
        query_embedding: embedding.values,
        match_threshold: 0.3,
        match_count: 5
      }
    );

    if (searchError) {
      console.error('Error searching course chunks:', searchError);
    }

    // Get chapter-specific chat history
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_history')
      .select('role, message, created_at')
      .eq('session_id', session_id)
      .eq('chapter_id', chapter_id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
    }

    // Format context and history
    const context = relevantChunks?.map((chunk: any) => chunk.content).join('\n\n') || '';
    const history = chatHistory?.map((msg: any) => `${msg.role}: ${msg.message}`).join('\n') || '';

    // Create the prompt
    const prompt = SOCRATIC_PROMPT_TEMPLATE
      .replace('{subject}', subject_name || 'the subject')
      .replace('{exam}', exam_name || 'the exam')
      .replace('{chapter}', chapter_name || 'the chapter')
      .replace('{context}', context)
      .replace('{chat_history}', history)
      .replace('{question}', question);

    // Generate response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    // Save user question to chat history
    const { error: userMessageError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        session_id: session_id,
        exam_id: exam_id,
        subject_id: subject_id,
        chapter_id: chapter_id,
        role: 'user',
        message: question
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Save AI response to chat history
    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        session_id: session_id,
        exam_id: exam_id,
        subject_id: subject_id,
        chapter_id: chapter_id,
        role: 'assistant',
        message: answer
      });

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
    }

    // Update session activity
    const { error: sessionUpdateError } = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', session_id);

    if (sessionUpdateError) {
      console.error('Error updating session:', sessionUpdateError);
    }

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});