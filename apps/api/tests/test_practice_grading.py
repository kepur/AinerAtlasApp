from app.schemas import PracticeExercise
from app.services.practice import generate_exercise, grade_answer, stash_exercise, take_exercise


def test_grade_answer_rejects_wrong_and_empty() -> None:
    exercise = PracticeExercise(
        exercise_type="translate",
        prompt="translate",
        correct_answer="I think Europe has more freedom",
    )
    assert grade_answer(exercise, "completely wrong answer") is False
    assert grade_answer(exercise, "a") is False
    assert grade_answer(exercise, "") is False
    assert grade_answer(exercise, "I think Europe has more freedom") is True


def test_grade_answer_choose_natural_requires_exact_match() -> None:
    exercise = PracticeExercise(
        exercise_type="choose_natural",
        prompt="pick one",
        correct_answer="Present perfect",
        options=["Present perfect", "Maybe present perfect"],
    )
    assert grade_answer(exercise, "Maybe present perfect") is False
    assert grade_answer(exercise, "Present perfect") is True


def test_exercise_token_roundtrip() -> None:
    exercise = PracticeExercise(
        exercise_type="fix_error",
        prompt="fix",
        correct_answer="She is happy",
    )
    token = stash_exercise("user-1", "item-1", exercise)
    loaded = take_exercise("user-1", "item-1", token)
    assert loaded is not None
    assert loaded.correct_answer == "She is happy"
    assert take_exercise("user-1", "item-1", token) is None


def test_generate_exercise_always_has_correct_answer() -> None:
    class Item:
        title = "I enjoy learning English"
        language_code = "en"
        examples = ["I enjoy learning English every day."]

    exercise = generate_exercise(Item())  # type: ignore[arg-type]
    assert exercise.correct_answer == "I enjoy learning English"
