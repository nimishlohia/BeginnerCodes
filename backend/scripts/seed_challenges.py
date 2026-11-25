#!/usr/bin/env python
"""
Development-only seed script for LevelUp coding challenges.

Usage (from the backend/ directory):
    .venv\\Scripts\\python.exe scripts\\seed_challenges.py

Requirements:
  - Run AFTER applying Alembic migrations (alembic upgrade head).
  - Safe to run multiple times: uses slug uniqueness to skip existing records.
  - Never seeds real user credentials.
  - Hidden test cases are seeded here but are NEVER returned in public API responses.
"""

import sys
import os

# Allow imports from the backend package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, SessionLocal
from app.models.challenge import CodingChallenge, ChallengeExample, ChallengeTestCase
from sqlalchemy import select

CHALLENGES = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "topic": "arrays",
        "description": (
            "Given an array of integers `nums` and an integer `target`, "
            "return the indices of the two numbers that add up to `target`.\n\n"
            "You may assume that each input would have exactly one solution, "
            "and you may not use the same element twice.\n\n"
            "You can return the answer in any order."
        ),
        "input_format": "First line: space-separated integers (the array)\nSecond line: target integer",
        "output_format": "Two space-separated integers (0-based indices)",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
        "is_published": True,
        "examples": [
            {
                "input_data": "2 7 11 15\n9",
                "expected_output": "0 1",
                "explanation": "nums[0] + nums[1] = 2 + 7 = 9",
                "display_order": 0,
            },
            {
                "input_data": "3 2 4\n6",
                "expected_output": "1 2",
                "explanation": "nums[1] + nums[2] = 2 + 4 = 6",
                "display_order": 1,
            },
        ],
        # Hidden test cases — never exposed through public API
        "test_cases": [
            {"input_data": "2 7 11 15\n9",  "expected_output": "0 1", "is_sample": True,  "display_order": 0},
            {"input_data": "3 2 4\n6",       "expected_output": "1 2", "is_sample": True,  "display_order": 1},
            {"input_data": "3 3\n6",          "expected_output": "0 1", "is_sample": False, "display_order": 2},
            {"input_data": "1 5 3 7\n8",      "expected_output": "1 3", "is_sample": False, "display_order": 3},
        ],
    },
    {
        "slug": "reverse-string",
        "title": "Reverse a String",
        "difficulty": "Easy",
        "topic": "strings",
        "description": (
            "Write a function that reverses a string.\n\n"
            "The input string is given as an array of characters `s`.\n\n"
            "You must do this in-place with O(1) extra memory."
        ),
        "input_format": "A single line containing a string",
        "output_format": "The reversed string",
        "constraints": "1 <= s.length <= 10^5\ns[i] is a printable ASCII character.",
        "is_published": True,
        "examples": [
            {
                "input_data": "hello",
                "expected_output": "olleh",
                "explanation": None,
                "display_order": 0,
            },
            {
                "input_data": "Hannah",
                "expected_output": "hannaH",
                "explanation": "Case is preserved",
                "display_order": 1,
            },
        ],
        "test_cases": [
            {"input_data": "hello",   "expected_output": "olleh",  "is_sample": True,  "display_order": 0},
            {"input_data": "Hannah",  "expected_output": "hannaH", "is_sample": True,  "display_order": 1},
            {"input_data": "a",       "expected_output": "a",      "is_sample": False, "display_order": 2},
            {"input_data": "abcdef",  "expected_output": "fedcba", "is_sample": False, "display_order": 3},
        ],
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "Medium",
        "topic": "stacks",
        "description": (
            "Given a string `s` containing only the characters `(`, `)`, `{`, `}`, `[` and `]`, "
            "determine if the input string is valid.\n\n"
            "An input string is valid if:\n"
            "- Open brackets must be closed by the same type of brackets.\n"
            "- Open brackets must be closed in the correct order.\n"
            "- Every close bracket has a corresponding open bracket of the same type."
        ),
        "input_format": "A single string containing only bracket characters",
        "output_format": "true or false",
        "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'",
        "is_published": True,
        "examples": [
            {
                "input_data": "()",
                "expected_output": "true",
                "explanation": None,
                "display_order": 0,
            },
            {
                "input_data": "()[]{}", 
                "expected_output": "true",
                "explanation": None,
                "display_order": 1,
            },
            {
                "input_data": "(]",
                "expected_output": "false",
                "explanation": None,
                "display_order": 2,
            },
        ],
        "test_cases": [
            {"input_data": "()",       "expected_output": "true",  "is_sample": True,  "display_order": 0},
            {"input_data": "()[]{}",   "expected_output": "true",  "is_sample": True,  "display_order": 1},
            {"input_data": "(]",       "expected_output": "false", "is_sample": True,  "display_order": 2},
            {"input_data": "{[()]}",   "expected_output": "true",  "is_sample": False, "display_order": 3},
            {"input_data": "([)]",     "expected_output": "false", "is_sample": False, "display_order": 4},
        ],
    },
    {
        "slug": "binary-search",
        "title": "Binary Search",
        "difficulty": "Easy",
        "topic": "binary search",
        "description": (
            "Given an array of integers `nums` sorted in ascending order, and an integer `target`, "
            "write a function to search `target` in `nums`.\n\n"
            "If `target` exists, return its index. Otherwise, return `-1`.\n\n"
            "You must write an algorithm with O(log n) runtime complexity."
        ),
        "input_format": "First line: space-separated sorted integers\nSecond line: target integer",
        "output_format": "Index of target (0-based) or -1 if not found",
        "constraints": "1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4\nAll integers in nums are unique\nnums is sorted in ascending order.",
        "is_published": True,
        "examples": [
            {
                "input_data": "-1 0 3 5 9 12\n9",
                "expected_output": "4",
                "explanation": "9 exists in nums and its index is 4",
                "display_order": 0,
            },
            {
                "input_data": "-1 0 3 5 9 12\n2",
                "expected_output": "-1",
                "explanation": "2 does not exist in nums so return -1",
                "display_order": 1,
            },
        ],
        "test_cases": [
            {"input_data": "-1 0 3 5 9 12\n9",   "expected_output": "4",  "is_sample": True,  "display_order": 0},
            {"input_data": "-1 0 3 5 9 12\n2",   "expected_output": "-1", "is_sample": True,  "display_order": 1},
            {"input_data": "5\n5",                "expected_output": "0",  "is_sample": False, "display_order": 2},
            {"input_data": "1 2 3 4 5\n6",        "expected_output": "-1", "is_sample": False, "display_order": 3},
        ],
    },
    {
        "slug": "climbing-stairs",
        "title": "Climbing Stairs",
        "difficulty": "Easy",
        "topic": "dynamic programming",
        "description": (
            "You are climbing a staircase. It takes `n` steps to reach the top.\n\n"
            "Each time you can either climb 1 or 2 steps. "
            "In how many distinct ways can you climb to the top?"
        ),
        "input_format": "A single integer n",
        "output_format": "The number of distinct ways to climb to the top",
        "constraints": "1 <= n <= 45",
        "is_published": True,
        "examples": [
            {
                "input_data": "2",
                "expected_output": "2",
                "explanation": "There are two ways: 1+1 or 2",
                "display_order": 0,
            },
            {
                "input_data": "3",
                "expected_output": "3",
                "explanation": "There are three ways: 1+1+1, 1+2, or 2+1",
                "display_order": 1,
            },
        ],
        "test_cases": [
            {"input_data": "2",  "expected_output": "2",    "is_sample": True,  "display_order": 0},
            {"input_data": "3",  "expected_output": "3",    "is_sample": True,  "display_order": 1},
            {"input_data": "5",  "expected_output": "8",    "is_sample": False, "display_order": 2},
            {"input_data": "10", "expected_output": "89",   "is_sample": False, "display_order": 3},
            {"input_data": "45", "expected_output": "1836311903", "is_sample": False, "display_order": 4},
        ],
    },
]


def seed() -> None:
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for ch_data in CHALLENGES:
            existing = db.execute(
                select(CodingChallenge).where(CodingChallenge.slug == ch_data["slug"])
            ).scalar_one_or_none()

            if existing:
                print(f"  SKIP  {ch_data['slug']!r} (already exists)")
                skipped += 1
                continue

            challenge = CodingChallenge(
                slug=ch_data["slug"],
                title=ch_data["title"],
                difficulty=ch_data["difficulty"],
                topic=ch_data["topic"],
                description=ch_data["description"],
                input_format=ch_data.get("input_format"),
                output_format=ch_data.get("output_format"),
                constraints=ch_data.get("constraints"),
                is_published=ch_data.get("is_published", True),
            )

            for ex in ch_data.get("examples", []):
                challenge.examples.append(
                    ChallengeExample(
                        input_data=ex["input_data"],
                        expected_output=ex["expected_output"],
                        explanation=ex.get("explanation"),
                        display_order=ex["display_order"],
                    )
                )

            for tc in ch_data.get("test_cases", []):
                challenge.test_cases.append(
                    ChallengeTestCase(
                        input_data=tc["input_data"],
                        expected_output=tc["expected_output"],
                        is_sample=tc.get("is_sample", False),
                        display_order=tc.get("display_order", 0),
                    )
                )

            db.add(challenge)
            db.commit()
            print(f"  CREATE {ch_data['slug']!r}")
            created += 1

    finally:
        db.close()

    print(f"\nSeed complete: {created} created, {skipped} skipped.")


if __name__ == "__main__":
    print("Seeding development challenges...")
    seed()
