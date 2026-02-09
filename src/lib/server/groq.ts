
import { GROQ_API_KEY } from '$env/static/private';

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

/**
 * Transcribe audio using Groq's distil-whisper-large-v3-en model.
 * Note: Groq requires a file upload, so we need to fetch the audio first and send it as FormData.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
    try {
        console.log(`🎙️ Fetching audio from: ${audioUrl}`);
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
        }
        const audioBlob = await audioResponse.blob();

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.mp3');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'text');

        console.log('🎙️ Sending to Groq for transcription...');
        const response = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq Transcription Error:', errorText);
            throw new Error(`Groq Transcription Failed: ${response.status} ${response.statusText}`);
        }

        const transcript = await response.text();
        console.log('✅ Transcription complete (length:', transcript.length, ')');
        return transcript;
    } catch (error) {
        console.error('Error in transcribeAudio:', error);
        throw error;
    }
}

/**
 * Analyze call transcript using Llama 3 to generate summary, intent, urgency, and action items.
 */
export async function analyzeCallLog(transcript: string): Promise<{
    summary: string;
    intent: string;
    urgency: 'low' | 'medium' | 'high';
    actionItems: string[];
    sentiment: string;
}> {
    try {
        const prompt = `
    Analyze the following phone call transcript.
    Provide the output in valid JSON format with the following keys:
    - "summary": A concise summary of the call (2-3 sentences).
    - "intent": The main purpose or intent of the call (e.g., "Request information", "Complaint", "Booking").
    - "urgency": One of "low", "medium", "high" based on the customer's tone and request.
    - "actionItems": A list of action items or next steps.
    - "sentiment": A brief description of the customer's sentiment (e.g., "Angry", "Happy", "Neutral").

    Transcript:
    "${transcript}"
    `;

        console.log('🧠 Sending to Groq for analysis...');
        const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that analyzes customer service calls. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1, // Low temperature for deterministic output
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq Analysis Error:', errorText);
            throw new Error(`Groq Analysis Failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content received from Groq analysis');
        }

        const result = JSON.parse(content);
        console.log('✅ Analysis complete:', result);

        return {
            summary: result.summary,
            intent: result.intent ?? '',
            urgency: result.urgency?.toLowerCase() || 'medium',
            actionItems: result.actionItems || [],
            sentiment: result.sentiment || 'Neutral'
        };

    } catch (error) {
        console.error('Error in analyzeCallLog:', error);
        return {
            summary: 'Analysis failed',
            intent: '',
            urgency: 'medium',
            actionItems: [],
            sentiment: 'Unknown'
        };
    }
}
