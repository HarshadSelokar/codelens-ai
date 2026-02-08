import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not set - LLM functionality will fail")

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json"
}

async def generate_answer(
    prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2000,
    model: str = "llama-3.1-8b-instant"
) -> str:
    """
    Generate LLM response using Groq API.
    
    Args:
        prompt: The prompt to send to the LLM
        temperature: Creativity level (0 = deterministic, 1 = creative)
        max_tokens: Maximum response length
        model: Groq model identifier
    
    Returns:
        Generated text response
    
    Raises:
        httpx.HTTPError: If API call fails
    """
    try:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_URL, headers=HEADERS, json=payload)
            response.raise_for_status()
            
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            
            logger.info(f"LLM response generated ({len(answer)} chars)")
            return answer

    except httpx.HTTPError as e:
        logger.error(f"Groq API error: {e}")
        raise
    except Exception as e:
        logger.error(f"LLM generation failed: {e}", exc_info=True)
        raise


async def explain_code(code: str, language: str = "unknown") -> str:
    """
    Standalone code explanation without RAG context.
    Useful for quick explanations of snippets.
    """
    prompt = f"""You are a senior software engineer.
Explain the following {language} code clearly and concisely.

Focus on:
- What the code does
- Key algorithms or patterns
- Potential issues or improvements

Do NOT generate new code. Only explain.

Code:
```{language}
{code}
```

Explanation:"""

    return await generate_answer(prompt, temperature=0.3)


async def explain_dom_element(dom_context: str, tag: str) -> str:
    """
    Explain DOM elements and UI components.
    Specialized prompt for UI understanding.
    """
    prompt = f"""You are a senior frontend engineer specializing in UI/UX.

Analyze this DOM element and explain:
1. **Purpose**: What is this element's role in the UI?
2. **Structure**: How is it structured (semantic HTML, classes)?
3. **Styling**: What visual styles are applied?
4. **Interactivity**: Any event handlers or dynamic behavior?
5. **Accessibility**: Any a11y considerations?
6. **Improvements**: Potential improvements or issues

DOM Context:
{dom_context}

Provide a clear, structured explanation suitable for a developer inspecting this element.

Explanation:"""

    return await generate_answer(prompt, temperature=0.3, max_tokens=1500)


async def summarize_file(file_content: str, file_path: str) -> str:
    """
    Generate a high-level summary of a file.
    Useful for file tree navigation tooltips.
    """
    # Truncate large files
    content_preview = file_content[:3000]
    
    prompt = f"""Summarize this code file in 2-3 sentences.

File: {file_path}

Code:
{content_preview}

Summary:"""

    return await generate_answer(prompt, temperature=0.2, max_tokens=200)


async def generate_answer_streaming(prompt: str, temperature: float = 0.2):
    """
    Streaming LLM response for progressive rendering.
    Returns an async generator for Server-Sent Events.
    """
    # TODO: Implement streaming with Groq streaming API
    # This significantly improves perceived performance
    raise NotImplementedError("Streaming not yet implemented")
