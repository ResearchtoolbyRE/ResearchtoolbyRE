// Netlify Function - Secure AI Proxy (DeepSeek + OpenRouter)
// Keys yahan nahi hain, Netlify Environment Variables se aayengi

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { type, question, image } = body;

        // ============================================================
        // TYPE 1: IMAGE ANALYSIS (OpenRouter Vision)
        // ============================================================
        if (type === 'image' && image) {
            const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
            const MODEL = process.env.OPENROUTER_VISION_MODEL || 'amazon/nova-2-lite-v1:free';

            if (!OPENROUTER_API_KEY) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenRouter key not configured' }) };
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'You are a helpful study assistant. Analyze this image and answer the question or explain the content in a clear educational manner. If it is a math problem, solve it step by step.' },
                            { type: 'image_url', image_url: { url: image } }
                        ]
                    }],
                    max_tokens: 800
                })
            });

            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || 'Could not analyze image.';
            return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
        }

        // ============================================================
        // TYPE 2: TEXT/STUDY QUESTION (DeepSeek)
        // ============================================================
        if (type === 'text' && question) {
            const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

            if (!DEEPSEEK_API_KEY) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'DeepSeek key not configured' }) };
            }

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful study assistant for school students. Explain concepts clearly, simply, and in an educational manner. Use examples. Keep answers concise but informative. If asked anything unrelated to studies, politely say you only help with study-related questions.'
                        },
                        { role: 'user', content: question }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                })
            });

            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || 'Could not generate answer.';
            return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request type' }) };

    } catch (error) {
        console.error('AI Function Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
