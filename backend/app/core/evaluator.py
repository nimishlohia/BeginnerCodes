"""
Evaluation interface and mock evaluator for Phase 4.

IMPORTANT — SECURITY NOTICE
============================
This module defines the boundary between submission storage and code execution.

The mock evaluator in this file does NOT execute user-submitted source code.
It returns a deterministic, clearly labelled simulated result for development
and testing purposes only.

A real evaluator must:
  - Run inside an isolated container or VM with no network access.
  - Enforce strict CPU, memory, and wall-clock time limits.
  - Have no access to the application database or credentials.
  - Communicate results back through a well-defined, authenticated channel.
  - Never be deployed inside the FastAPI process or application container.

Do not replace the mock evaluator with real execution without explicit approval
and a thorough security review.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes — evaluation request and result
# ---------------------------------------------------------------------------

@dataclass
class EvaluationRequest:
    """Input passed to the evaluator."""
    submission_id: int
    challenge_id: int
    language: str
    # source_code is deliberately excluded from logging


@dataclass
class EvaluationResult:
    """
    Normalized result returned by the evaluator.

    result_summary must be sanitized — it must never contain:
    - Hidden test case inputs or expected outputs.
    - Internal evaluator paths, configuration, or secrets.
    - Raw exception tracebacks that could reveal infrastructure details.
    """
    status: str            # One of the SUBMISSION_STATUSES values
    result_summary: Optional[str]
    execution_time_ms: Optional[int]
    is_simulated: bool     # Always True for the mock evaluator


# ---------------------------------------------------------------------------
# Evaluator interface
# ---------------------------------------------------------------------------

class BaseEvaluator:
    """Abstract interface that any real evaluator must implement."""

    def evaluate(self, request: EvaluationRequest, source_code: str) -> EvaluationResult:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Mock evaluator — deterministic, never executes code
# ---------------------------------------------------------------------------

class MockEvaluator(BaseEvaluator):
    """
    Development-only mock evaluator.

    Behaviour
    ---------
    - NEVER executes submitted source code.
    - Returns a deterministic ACCEPTED result for all non-empty submissions.
    - Marks every result with is_simulated=True.
    - Does NOT reflect the correctness of the submitted code.
    - Suitable only for testing the submission flow and UI.
    """

    SIMULATED_DISCLAIMER = (
        "[SIMULATED] This result is a placeholder from the mock evaluator. "
        "No code was executed. A real evaluator must be integrated before "
        "results reflect actual correctness."
    )

    def evaluate(self, request: EvaluationRequest, source_code: str) -> EvaluationResult:
        """
        Return a deterministic simulated result without executing any code.

        The source_code parameter is accepted by the interface but intentionally
        ignored — it is never interpreted, compiled, or executed.
        """
        logger.info(
            "MockEvaluator: simulating evaluation for submission_id=%s "
            "challenge_id=%s language=%s [NO CODE EXECUTED]",
            request.submission_id,
            request.challenge_id,
            request.language,
        )

        return EvaluationResult(
            status="ACCEPTED",
            result_summary=self.SIMULATED_DISCLAIMER,
            execution_time_ms=0,
            is_simulated=True,
        )


# ---------------------------------------------------------------------------
# Evaluation service — applies the result to the database
# ---------------------------------------------------------------------------

def apply_evaluation_result(
    submission_id: int,
    result: EvaluationResult,
    db: "Session",
) -> None:
    """
    Write the evaluator result to the database.

    This is the only place where submission.status and submission.result_summary
    are set after creation. It is called by trusted server-side code only,
    never from user-supplied input.
    """
    from app.models.submission import CodeSubmission

    submission = db.get(CodeSubmission, submission_id)
    if submission is None:
        logger.error("apply_evaluation_result: submission_id=%s not found", submission_id)
        return

    submission.status = result.status
    submission.result_summary = result.result_summary
    submission.execution_time_ms = result.execution_time_ms
    submission.evaluated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info(
        "apply_evaluation_result: submission_id=%s updated to status=%s",
        submission_id,
        result.status,
    )


# ---------------------------------------------------------------------------
# Module-level evaluator instance — swap for a real evaluator post-approval
# ---------------------------------------------------------------------------

evaluator: BaseEvaluator = MockEvaluator()
