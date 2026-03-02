# Java Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Java version: {{JAVA_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Naming Conventions
- Classes: PascalCase (`UserService`, `OrderRepository`)
- Methods/variables: camelCase (`getUserById`, `orderTotal`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Packages: lowercase (`com.company.project`)

### Code Organization
- One public class per file
- Package-private classes for implementation details
- Group related classes in packages
- Use meaningful package names

### Best Practices
- Prefer composition over inheritance
- Program to interfaces, not implementations
- Use `Optional<T>` instead of returning `null`
- Use try-with-resources for auto-closeable
- Favor immutability (final fields, unmodifiable collections)
- Use streams for collection operations

### Modern Java (8+)
- Use lambda expressions and method references
- Use Stream API for collections
- Use `java.time` for dates (not `Date`/`Calendar`)
- Use `var` for local variables (Java 10+)
- Use text blocks for multi-line strings (Java 15+)

## Anti-Patterns to Flag

| I See | I Do | Severity |
|-------|------|----------|
| Returning `null` | Use `Optional<T>` | HIGH |
| Catching generic `Exception` | Catch specific exceptions | HIGH |
| Not closing resources | Use try-with-resources | CRITICAL |
| Using `Date`/`Calendar` | Use `java.time` classes | MEDIUM |
| Mutable static fields | Use final or immutable collections | HIGH |
| Not overriding `equals()` and `hashCode()` together | Override both or neither | HIGH |
| Raw types (`List list`) | Use generics (`List<String>`) | MEDIUM |
| String concatenation in loops | Use `StringBuilder` | MEDIUM |

## Common Patterns

### Optional Instead of Null
```java
// Good: Optional
public Optional<User> findUserById(Long id) {
    return userRepository.findById(id);
}

user.findUserById(1L).ifPresent(u -> System.out.println(u.getName()));

// Bad: Null
public User findUserById(Long id) {
    return userRepository.findById(id);  // Might return null
}
```

### Try-With-Resources
```java
// Good: Auto-close
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    return reader.readLine();
}

// Bad: Manual close
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("file.txt"));
    return reader.readLine();
} finally {
    if (reader != null) reader.close();
}
```

### Streams API
```java
// Good: Stream
List<String> names = users.stream()
    .filter(user -> user.isActive())
    .map(User::getName)
    .collect(Collectors.toList());

// Bad: Loop
List<String> names = new ArrayList<>();
for (User user : users) {
    if (user.isActive()) {
        names.add(user.getName());
    }
}
```

### Immutable Collections
```java
// Good: Unmodifiable
private final List<String> items = List.of("a", "b", "c");

// Or if building dynamically:
private final List<String> items;
public MyClass(List<String> input) {
    this.items = List.copyOf(input);  // Defensive copy
}

// Bad: Mutable
private final List<String> items = new ArrayList<>();
```

### Modern Date/Time
```java
// Good: java.time
LocalDate today = LocalDate.now();
LocalDateTime now = LocalDateTime.now();
ZonedDateTime utcNow = ZonedDateTime.now(ZoneOffset.UTC);

// Bad: Old API
Date date = new Date();
Calendar calendar = Calendar.getInstance();
```

## Design Patterns

### Dependency Injection
```java
// Good: Constructor injection
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}

// Bad: Field injection or new keyword
public class UserService {
    private UserRepository repository = new UserRepositoryImpl();
}
```

### Builder Pattern
```java
public class User {
    private final String name;
    private final String email;
    private final int age;

    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.age = builder.age;
    }

    public static class Builder {
        private String name;
        private String email;
        private int age;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder age(int age) {
            this.age = age;
            return this;
        }

        public User build() {
            return new User(this);
        }
    }
}

// Usage:
User user = new User.Builder()
    .name("Alice")
    .email("alice@example.com")
    .age(30)
    .build();
```

### Factory Pattern
```java
public interface Shape {
    void draw();
}

public class ShapeFactory {
    public static Shape createShape(String type) {
        return switch (type) {
            case "circle" -> new Circle();
            case "square" -> new Square();
            default -> throw new IllegalArgumentException("Unknown shape: " + type);
        };
    }
}
```

## Testing Patterns

### JUnit 5
```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest {
    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(new InMemoryUserRepository());
    }

    @Test
    @DisplayName("Should find user by ID")
    void shouldFindUserById() {
        // Given
        Long userId = 1L;

        // When
        Optional<User> result = service.findById(userId);

        // Then
        assertTrue(result.isPresent());
        assertEquals("Alice", result.get().getName());
    }

    @ParameterizedTest
    @ValueSource(strings = {"alice@test.com", "bob@test.com"})
    void shouldValidateEmails(String email) {
        assertTrue(service.isValidEmail(email));
    }
}
```

### Mockito
```java
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository repository;

    @InjectMocks
    private UserService service;

    @Test
    void shouldDelegateToRepository() {
        // Given
        User user = new User("Alice");
        when(repository.save(any(User.class))).thenReturn(user);

        // When
        User result = service.createUser("Alice");

        // Then
        verify(repository).save(argThat(u -> u.getName().equals("Alice")));
        assertEquals("Alice", result.getName());
    }
}
```

## Exception Handling

### Custom Exceptions
```java
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("User not found: " + id);
    }
}

// Usage:
public User getUserById(Long id) {
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
}
```

### Try-Catch Guidelines
- Catch specific exceptions
- Log with context
- Don't swallow exceptions
- Rethrow or wrap in domain exception

## Concurrency

### Thread Safety
```java
// Good: Synchronized or concurrent collections
private final Map<String, User> cache = new ConcurrentHashMap<>();

// Or synchronized method
public synchronized void updateUser(User user) {
    // Thread-safe update
}

// Or use locks
private final ReentrantLock lock = new ReentrantLock();
public void updateUser(User user) {
    lock.lock();
    try {
        // Critical section
    } finally {
        lock.unlock();
    }
}
```

### Executor Service
```java
ExecutorService executor = Executors.newFixedThreadPool(10);

executor.submit(() -> {
    // Task here
});

executor.shutdown();
executor.awaitTermination(1, TimeUnit.MINUTES);
```

## Performance Tips

- Use `StringBuilder` for string concatenation in loops
- Use primitive streams (`IntStream`, `LongStream`) when possible
- Avoid unnecessary object creation
- Use lazy initialization for expensive objects
- Profile before optimizing
- Consider caching expensive computations

## Web Resources

- [Java Documentation](https://docs.oracle.com/en/java/)
- [Effective Java](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Java Design Patterns](https://java-design-patterns.com/)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://site.mockito.org/)

---

_This file was auto-generated by `/atta` based on your project's Java setup._
_To regenerate: run `/atta --rescan`_
_To customize: edit this file directly (your changes will be preserved)_
