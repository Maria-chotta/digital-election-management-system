from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('election_api', '0004_candidate_position_vote_position_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='election',
            name='results_published',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='election',
            name='results_published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

