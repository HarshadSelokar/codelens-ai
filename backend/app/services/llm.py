import os
import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json"
}

async def generate_answer(prompt: str, temperature: float = 0.2):
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature
    }

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(GROQ_URL, headers=HEADERS, json=payload)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]


async def explain_code(code: str, language: str):
    prompt = f"""
You are a senior software engineer.
Explain the following {language} code clearly and concisely.
Do NOT generate new code. Only explain.

Code:
{code}
"""

    return await generate_answer(prompt, temperature=0.3)
    