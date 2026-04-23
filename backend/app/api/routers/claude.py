from __future__ import annotations

import logging

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(tags=["claude"])

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message to send to Claude")
    model: str = Field(
        default="claude-opus-4-5",
        description="Anthropic model identifier",
    )
    max_tokens: int = Field(
        default=1024,
        ge=1,
        le=8096,
        description="Maximum number of tokens in the response",
    )
    system_prompt: str | None = Field(
        default=None,
        description="Optional system prompt to guide Claude's behaviour",
    )


class ChatResponse(BaseModel):
    response: str = Field(..., description="Claude's reply text")
    model: str = Field(..., description="Model that produced the response")
    input_tokens: int = Field(..., description="Tokens consumed by the prompt")
    output_tokens: int = Field(..., description="Tokens consumed by the completion")


class AnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Text or data to analyse")
    instruction: str = Field(
        ...,
        min_length=1,
        description="Specific analysis instruction (e.g. 'Summarise the key risks')",
    )
    model: str = Field(
        default="claude-opus-4-5",
        description="Anthropic model identifier",
    )
    max_tokens: int = Field(
        default=2048,
        ge=1,
        le=8096,
        description="Maximum number of tokens in the response",
    )


class AnalyzeResponse(BaseModel):
    analysis: str = Field(..., description="Claude's analysis result")
    model: str = Field(..., description="Model that produced the response")
    input_tokens: int = Field(..., description="Tokens consumed by the prompt")
    output_tokens: int = Field(..., description="Tokens consumed by the completion")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_client() -> anthropic.Anthropic:
    """Return an Anthropic client, raising 503 if the API key is not configured."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Anthropic API key is not configured. Set the ANTHROPIC_API_KEY environment variable.",
        )
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with Claude",
    description=(
        "Send a single user message to Claude and receive a text response. "
        "An optional system prompt can be provided to customise Claude's persona or constraints."
    ),
)
def chat(payload: ChatRequest) -> ChatResponse:
    client = _get_client()

    kwargs: dict = {
        "model": payload.model,
        "max_tokens": payload.max_tokens,
        "messages": [{"role": "user", "content": payload.message}],
    }
    if payload.system_prompt:
        kwargs["system"] = payload.system_prompt

    try:
        message = client.messages.create(**kwargs)
    except anthropic.AuthenticationError as exc:
        logger.error("anthropic_auth_error: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid Anthropic API key.") from exc
    except anthropic.RateLimitError as exc:
        logger.warning("anthropic_rate_limit: %s", exc)
        raise HTTPException(status_code=429, detail="Anthropic rate limit reached. Please retry later.") from exc
    except anthropic.APIError as exc:
        logger.error("anthropic_api_error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {exc}") from exc

    reply_text = message.content[0].text if message.content else ""

    logger.info(
        "claude_chat",
        extra={
            "extra_data": {
                "model": message.model,
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens,
            }
        },
    )

    return ChatResponse(
        response=reply_text,
        model=message.model,
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyse text or data with Claude",
    description=(
        "Submit a block of text or structured data together with an analysis instruction. "
        "Claude will follow the instruction and return a structured analysis."
    ),
)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    client = _get_client()

    user_message = f"{payload.instruction}\n\n---\n\n{payload.content}"

    try:
        message = client.messages.create(
            model=payload.model,
            max_tokens=payload.max_tokens,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.AuthenticationError as exc:
        logger.error("anthropic_auth_error: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid Anthropic API key.") from exc
    except anthropic.RateLimitError as exc:
        logger.warning("anthropic_rate_limit: %s", exc)
        raise HTTPException(status_code=429, detail="Anthropic rate limit reached. Please retry later.") from exc
    except anthropic.APIError as exc:
        logger.error("anthropic_api_error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {exc}") from exc

    analysis_text = message.content[0].text if message.content else ""

    logger.info(
        "claude_analyze",
        extra={
            "extra_data": {
                "model": message.model,
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens,
            }
        },
    )

    return AnalyzeResponse(
        analysis=analysis_text,
        model=message.model,
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
    )
