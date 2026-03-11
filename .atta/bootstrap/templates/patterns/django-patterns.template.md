# Django Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Django version: {{DJANGO_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Models
- Use Django ORM for database operations (avoid raw SQL)
- Define `__str__()` method for all models
- Use `related_name` for reverse relationships
- Use `Meta.ordering` for default sort order
- Use `choices` for fixed options
- Add database indexes for frequently queried fields
- Use `blank=True` and `null=True` appropriately

### Views
- Use class-based views for CRUD operations
- Use function-based views for simple logic
- Keep views thin (move logic to models, managers, or services)
- Use Django forms for validation
- Use `get_object_or_404()` instead of try/except DoesNotExist
- Return proper HTTP status codes

### Templates
- Keep logic minimal (use template tags/filters)
- Use `{% load static %}` for static files
- Use `{% url %}` for URL generation
- Escape user input (Django does by default with `{{ }}`)
- Use `{% csrf_token %}` in all POST forms

### URLs
- Use path names with `name` parameter
- Organize URLs with `include()`
- Use path converters (`<int:pk>`, `<slug:slug>`)
- Keep URL patterns RESTful when building APIs

### Security
- Never disable CSRF protection
- Use Django's authentication system
- Sanitize user input in forms
- Use permissions and decorators (`@login_required`)
- Keep `SECRET_KEY` in environment variables
- Use HTTPS in production (set `SECURE_SSL_REDIRECT`)

### Settings
- Use separate settings for dev/staging/prod
- Store secrets in environment variables
- Use `django-environ` or similar for config management
- Never commit `SECRET_KEY` or credentials

## Anti-Patterns to Flag

| I See | I Do | Severity |
|-------|------|----------|
| Raw SQL queries | Use Django ORM | HIGH |
| Logic in templates | Move to views or template tags | MEDIUM |
| Accessing `request` in models | Pass data via parameters | HIGH |
| Not using migrations | Always create and apply migrations | CRITICAL |
| `objects.get()` without exception handling | Use `get_object_or_404()` | HIGH |

| Foreign key without `on_delete` | Specify `on_delete` behavior | CRITICAL |
| Missing `__str__()` on models | Add for better debugging | MEDIUM |
| Not using `select_related` / `prefetch_related` | Optimize queries to avoid N+1 | HIGH |

## Common Patterns

### Model Definition
```python
from django.db import models

class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    author = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='articles'
    )
    published = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10,
        choices=[('draft', 'Draft'), ('published', 'Published')],
        default='draft'
    )

    class Meta:
        ordering = ['-published']
        indexes = [
            models.Index(fields=['status', 'published']),
        ]

    def __str__(self):
        return self.title
```

### Class-Based View
```python
from django.views.generic import ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin

class ArticleListView(ListView):
    model = Article
    template_name = 'articles/list.html'
    context_object_name = 'articles'
    paginate_by = 20

    def get_queryset(self):
        return Article.objects.filter(status='published').select_related('author')

class ArticleDetailView(LoginRequiredMixin, DetailView):
    model = Article
    template_name = 'articles/detail.html'
```

### Django Form
```python
from django import forms
from .models import Article

class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'slug', 'content', 'status']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 10}),
        }

    def clean_slug(self):
        slug = self.cleaned_data['slug']
        if Article.objects.filter(slug=slug).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Slug already exists")
        return slug
```

### Custom Manager
```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published')

class Article(models.Model):
    # ... fields ...

    objects = models.Manager()  # Default manager
    published = PublishedManager()  # Custom manager
```

### Query Optimization
```python
# Bad: N+1 queries
articles = Article.objects.all()
for article in articles:
    print(article.author.username)  # Separate query per author!

# Good: select_related (for ForeignKey/OneToOne)
articles = Article.objects.select_related('author').all()
for article in articles:
    print(article.author.username)  # No extra queries

# Good: prefetch_related (for ManyToMany/reverse FK)
articles = Article.objects.prefetch_related('tags').all()
for article in articles:
    print(article.tags.all())  # Efficient batched query
```

## Django REST Framework Patterns

{{#if HAS_DRF}}
### Serializers
```python
from rest_framework import serializers
from .models import Article

class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Article
        fields = ['id', 'title', 'slug', 'author_name', 'published']
        read_only_fields = ['published']
```

### ViewSets
```python
from rest_framework import viewsets, permissions
from .models import Article
from .serializers import ArticleSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(status='published')
        return queryset.select_related('author')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
```
{{/if}}

## Testing Patterns

### Model Tests
```python
from django.test import TestCase
from .models import Article

class ArticleModelTest(TestCase):
    def setUp(self):
        self.article = Article.objects.create(
            title="Test Article",
            slug="test-article"
        )

    def test_str_representation(self):
        self.assertEqual(str(self.article), "Test Article")

    def test_slug_is_unique(self):
        with self.assertRaises(Exception):
            Article.objects.create(
                title="Another Article",
                slug="test-article"  # Duplicate!
            )
```

### View Tests
```python
from django.test import TestCase, Client
from django.urls import reverse

class ArticleViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.article = Article.objects.create(
            title="Test", slug="test", status='published'
        )

    def test_list_view(self):
        response = self.client.get(reverse('article-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test")

    def test_detail_view(self):
        url = reverse('article-detail', kwargs={'slug': 'test'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
```

## Migrations

### Best Practices
- Create migrations for every model change
- Review migrations before committing
- Never edit old migrations (create new ones)
- Use `RunPython` for data migrations
- Test migrations on copy of production data
- Keep migrations small and focused

### Data Migration
```python
from django.db import migrations

def forwards(apps, schema_editor):
    Article = apps.get_model('blog', 'Article')
    Article.objects.filter(status='old').update(status='published')

def backwards(apps, schema_editor):
    Article = apps.get_model('blog', 'Article')
    Article.objects.filter(status='published').update(status='old')

class Migration(migrations.Migration):
    dependencies = [
        ('blog', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
```

## Admin Customization

```python
from django.contrib import admin
from .models import Article

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'published']
    list_filter = ['status', 'published']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published'
    ordering = ['-published']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author')
```

## Celery Integration

{{#if HAS_CELERY}}
### Background Tasks
```python
from celery import shared_task
from .models import Article

@shared_task
def process_article(article_id):
    article = Article.objects.get(pk=article_id)
    # Long-running task here
    article.processed = True
    article.save()

# In view:
process_article.delay(article.pk)  # Non-blocking
```
{{/if}}

## Performance Tips

- Use `select_related()` for ForeignKey/OneToOne
- Use `prefetch_related()` for ManyToMany/reverse FK
- Use `only()` and `defer()` to limit fields
- Use `values()` and `values_list()` for raw data
- Cache expensive queries with Django's cache framework
- Use database indexes on frequently queried fields
- Use `bulk_create()` and `bulk_update()` for batch operations

## Security Checklist

- ✅ CSRF protection enabled (default)
- ✅ XSS protection via template auto-escaping
- ✅ SQL injection protection via ORM
- ✅ Clickjacking protection (`X-Frame-Options`)
- ✅ HTTPS redirect in production
- ✅ Secure cookies (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`)
- ✅ Strong `SECRET_KEY` in environment
- ✅ Debug mode OFF in production
- ✅ Content Security Policy headers
- ✅ Rate limiting for APIs

## Web Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django Best Practices](https://django-best-practices.readthedocs.io/)
- [Classy Class-Based Views](https://ccbv.co.uk/)
{{#if HAS_DRF}}
- [Django REST Framework](https://www.django-rest-framework.org/)
{{/if}}

---

_This file was auto-generated by `/atta` based on your project's Django setup._
_To regenerate: run `/atta --rescan`_
_To customize: edit this file directly (your changes will be preserved)_
