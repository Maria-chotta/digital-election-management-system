import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
User.objects.filter(username='admin').delete()
admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
print(f'✓ Admin user created: {admin.username}')
