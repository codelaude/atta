# Python Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Python version: {{PYTHON_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Code Style (PEP 8)
- Use 4 spaces for indentation (never tabs)
- Maximum line length: 88 characters (Black formatter) or 79 (PEP 8)
- Use snake_case for functions and variables
- Use PascalCase for classes
- Use UPPERCASE for constants
- Two blank lines between top-level functions/classes
- One blank line between methods

### Type Hints
- Use type hints for function signatures
- Use `Optional[T]` for nullable values
- Use `Union[T1, T2]` or `T1 | T2` for multiple types (Python 3.10+)
- Use `list[T]`, `dict[K, V]` for generic collections (Python 3.9+)
- Use `from typing import` for older Python versions
- Use `mypy` for static type checking

### Error Handling
- Catch specific exceptions, never bare `except:`
- Use context managers (`with` statement) for resource handling
- Raise exceptions with descriptive messages
- Use custom exceptions for domain-specific errors
- Log exceptions with context

### Functions and Methods
- Keep functions small and focused (single responsibility)
- Use list comprehensions for simple transformations
- Prefer generator expressions for large datasets
- Use `*args` and `**kwargs` appropriately
- Document with docstrings (Google or NumPy style)

### Data Structures
- Use `dataclasses` or `pydantic` for structured data
- Use `NamedTuple` for immutable records
- Prefer `dict` comprehensions over loops
- Use `set` for membership testing
- Use `defaultdict` and `Counter` from collections

### Testing
- Use pytest for testing
- Write descriptive test names (`test_should_validate_email_format`)
- Use fixtures for test setup
- Mock external dependencies
- Aim for high coverage on critical paths

## Anti-Patterns to Flag

| I See | I Do | Severity |
|-------|------|----------|
| Bare `except:` clause | Catch specific exceptions | CRITICAL |
| Mutable default arguments (`def foo(x=[]):`) | Use `None` and initialize in function | CRITICAL |
| Global variables for state | Use function parameters and return values | HIGH |
| Not using context managers for files | Use `with open() as f:` | HIGH |
| String concatenation in loops | Use `"".join()` or f-strings | MEDIUM |
| Using `==` for `None` check | Use `is None` or `is not None` | MEDIUM |
| Not using list comprehensions | Use comprehensions for simple transformations | LOW |
| Reinventing stdlib | Use standard library (itertools, collections, etc.) | MEDIUM |

## Common Patterns

### File I/O
```python
# Good: Context manager
with open('file.txt', 'r') as f:
    content = f.read()

# Bad: Manual close
f = open('file.txt', 'r')
content = f.read()
f.close()  # May not execute if exception occurs
```

### Error Handling
```python
# Good: Specific exception
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise

# Bad: Bare except
try:
    result = risky_operation()
except:  # Catches everything, including KeyboardInterrupt!
    pass
```

### Type Hints
```python
# Good: Clear types
def process_users(users: list[User]) -> dict[str, int]:
    return {user.name: user.age for user in users}

# Bad: No types
def process_users(users):
    return {user.name: user.age for user in users}
```

### Default Arguments
```python
# Good: Immutable default
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items

# Bad: Mutable default (shared across calls!)
def add_item(item: str, items: list[str] = []) -> list[str]:
    items.append(item)
    return items
```

### List Comprehensions
```python
# Good: Comprehension
squared = [x**2 for x in range(10) if x % 2 == 0]

# Bad: Loop
squared = []
for x in range(10):
    if x % 2 == 0:
        squared.append(x**2)
```

## Project-Specific Conventions

{{#if HAS_VIRTUAL_ENV}}
### Virtual Environment
- Use `venv` or `virtualenv` for isolation
- Keep `requirements.txt` or `pyproject.toml` updated
- Use `pip-tools` or `poetry` for dependency management
{{/if}}

{{#if HAS_ASYNC}}
### Async/Await
- Use `async def` for async functions
- Use `await` for async calls (never block with `.result()`)
- Use `asyncio.gather()` for parallel async operations
- Use `aiohttp` for async HTTP requests
- Be careful with synchronous code in async functions
{{/if}}

{{#if HAS_DATACLASSES}}
### Dataclasses
```python
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int
    email: str | None = None
```
{{/if}}

## Testing Patterns

### Pytest Fixtures
```python
import pytest

@pytest.fixture
def sample_user():
    return User(name="Alice", age=30)

def test_user_validation(sample_user):
    assert sample_user.is_valid()
```

### Mocking
```python
from unittest.mock import patch, MagicMock

@patch('mymodule.external_api_call')
def test_function(mock_api):
    mock_api.return_value = {'status': 'ok'}
    result = my_function()
    assert result.success
```

### Parametrize
```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
])
def test_uppercase(input, expected):
    assert input.upper() == expected
```

## Performance Tips

- Use generators for large datasets (`yield` instead of returning lists)
- Profile with `cProfile` or `py-spy` before optimizing
- Use `__slots__` for classes with many instances
- Consider `numpy` for numerical computations
- Use `lru_cache` for memoization
- Batch database operations instead of one-at-a-time

## Security

- Never use `eval()` or `exec()` on user input
- Sanitize SQL with parameterized queries (never string formatting)
- Use secrets module for cryptographic randomness
- Validate and sanitize all external input
- Keep dependencies updated (use `pip-audit` or `safety`)

## Web Resources

- [Python Documentation](https://docs.python.org/3/)
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
- [Real Python Tutorials](https://realpython.com/)
{{#if HAS_ASYNC}}
- [AsyncIO Documentation](https://docs.python.org/3/library/asyncio.html)
{{/if}}

---

_This file was auto-generated by `/atta` based on your project's Python setup._
_To regenerate: run `/atta --rescan`_
_To customize: edit this file directly (your changes will be preserved)_
