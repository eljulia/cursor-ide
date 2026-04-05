from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint
from app.models.base import BaseModel


class Rating(BaseModel):
    __tablename__ = 'ratings'
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    )

    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
