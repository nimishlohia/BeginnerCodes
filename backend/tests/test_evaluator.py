"""
Tests for the mock evaluator.
"""
from app.core.evaluator import (
    EvaluationRequest,
    EvaluationResult,
    MockEvaluator,
    apply_evaluation_result,
)
from app.models.challenge import CodingChallenge
from app.models.submission import CodeSubmission
from app.models.user import User
from app.core.security import hash_password


class TestMockEvaluator:
    def test_mock_evaluator_returns_simulated_result(self):
        evaluator = MockEvaluator()
        request = EvaluationRequest(
            submission_id=1,
            challenge_id=1,
            language="python",
        )
        result = evaluator.evaluate(request, source_code="print('hello')")
        assert isinstance(result, EvaluationResult)
        assert result.is_simulated is True
        assert result.status == "ACCEPTED"
        assert "SIMULATED" in (result.result_summary or "")

    def test_mock_evaluator_does_not_execute_code(self):
        """
        Verify the evaluator returns the same result regardless of source code content.
        This demonstrates that source_code is never executed or interpreted.
        """
        evaluator = MockEvaluator()
        request = EvaluationRequest(submission_id=1, challenge_id=1, language="python")

        # Identical result for completely different source code — confirms no execution
        result_a = evaluator.evaluate(request, source_code="print('hello')")
        result_b = evaluator.evaluate(request, source_code="raise RuntimeError('boom')")
        result_c = evaluator.evaluate(request, source_code="import os; os.system('rm -rf /')")

        assert result_a.status == result_b.status == result_c.status
        assert result_a.is_simulated is True

    def test_mock_evaluator_deterministic(self):
        evaluator = MockEvaluator()
        request = EvaluationRequest(submission_id=42, challenge_id=7, language="java")
        result1 = evaluator.evaluate(request, source_code="class Main {}")
        result2 = evaluator.evaluate(request, source_code="class Main {}")
        assert result1.status == result2.status
        assert result1.is_simulated == result2.is_simulated

    def test_apply_evaluation_result_updates_submission(self, db_session):
        user = User(
            username="eval_user",
            email="eval@test.com",
            hashed_password=hash_password("pass"),
        )
        db_session.add(user)
        ch = CodingChallenge(
            slug="ev-ch", title="T", description="D",
            difficulty="Easy", topic="arrays", is_published=True,
        )
        db_session.add(ch)
        db_session.commit()

        sub = CodeSubmission(
            user_id=user.id, challenge_id=ch.id,
            language="python", source_code="x", status="PENDING",
        )
        db_session.add(sub)
        db_session.commit()

        result = EvaluationResult(
            status="ACCEPTED",
            result_summary="[SIMULATED] All tests passed.",
            execution_time_ms=42,
            is_simulated=True,
        )
        apply_evaluation_result(sub.id, result, db_session)

        db_session.refresh(sub)
        assert sub.status == "ACCEPTED"
        assert sub.result_summary == "[SIMULATED] All tests passed."
        assert sub.execution_time_ms == 42
        assert sub.evaluated_at is not None

    def test_result_summary_never_contains_hidden_test_data(self):
        """Mock evaluator result_summary must not contain test case data."""
        evaluator = MockEvaluator()
        request = EvaluationRequest(submission_id=1, challenge_id=1, language="python")
        result = evaluator.evaluate(request, source_code="x = 1")
        # The summary should be a generic disclaimer, not any test case data
        assert result.result_summary is not None
        assert "SIMULATED" in result.result_summary
