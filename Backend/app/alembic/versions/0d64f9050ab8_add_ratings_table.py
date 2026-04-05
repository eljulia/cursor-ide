"""add_ratings_table

Revision ID: 0d64f9050ab8
Revises: d18a08253457
Create Date: 2026-03-31 04:44:18.273131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d64f9050ab8'
down_revision: Union[str, None] = 'd18a08253457'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('ratings',
    sa.Column('course_id', sa.Integer(), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ratings_course_id'), 'ratings', ['course_id'], unique=False)
    op.create_index(op.f('ix_ratings_id'), 'ratings', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_ratings_id'), table_name='ratings')
    op.drop_index(op.f('ix_ratings_course_id'), table_name='ratings')
    op.drop_table('ratings')
