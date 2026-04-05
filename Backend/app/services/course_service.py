from typing import List, Optional, Dict, Any
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.teacher import Teacher
from app.models.rating import Rating


class CourseService:
    """
    Service class for handling course-related operations.
    Implements the contract specifications for course endpoints.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all_courses(self) -> List[Dict[str, Any]]:
        """
        Get all courses with basic information (no teachers or lessons).
        
        Returns:
            List of course dictionaries with: id, name, description, thumbnail, slug
        """
        courses = self.db.query(Course).filter(Course.deleted_at.is_(None)).all()
        
        return [
            {
                "id": course.id,
                "name": course.name,
                "description": course.description,
                "thumbnail": course.thumbnail,
                "slug": course.slug
            }
            for course in courses
        ]

    def get_course_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Get course details by slug including teachers and lessons.
        
        Args:
            slug: The course slug
            
        Returns:
            Course dictionary with teachers and lessons, or None if not found
        """
        course = (
            self.db.query(Course)
            .options(
                joinedload(Course.teachers),
                joinedload(Course.lessons)
            )
            .filter(Course.slug == slug)
            .filter(Course.deleted_at.is_(None))
            .first()
        )
        
        if not course:
            return None
            
        rating_summary = self.get_average_rating(course.id)

        return {
            "id": course.id,
            "name": course.name,
            "description": course.description,
            "thumbnail": course.thumbnail,
            "slug": course.slug,
            "teacher_id": [teacher.id for teacher in course.teachers],
            "classes": [
                {
                    "id": lesson.id,
                    "name": lesson.name,
                    "description": lesson.description,
                    "slug": lesson.slug
                }
                for lesson in course.lessons
                if lesson.deleted_at is None
            ],
            "average_rating": rating_summary["average_rating"],
            "rating_count": rating_summary["rating_count"],
        }

    def create_rating(self, course_id: int, rating: int) -> Dict[str, Any]:
        course = self.db.query(Course).filter(
            Course.id == course_id, Course.deleted_at.is_(None)
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        if not (1 <= rating <= 5):
            raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")

        new_rating = Rating(course_id=course_id, rating=rating)
        self.db.add(new_rating)
        self.db.commit()
        self.db.refresh(new_rating)

        return {
            "id": new_rating.id,
            "course_id": new_rating.course_id,
            "rating": new_rating.rating,
        }

    def get_ratings_by_course(self, course_id: int) -> List[Dict[str, Any]]:
        ratings = (
            self.db.query(Rating)
            .filter(Rating.course_id == course_id, Rating.deleted_at.is_(None))
            .order_by(Rating.created_at.desc())
            .all()
        )
        return [{"id": r.id, "course_id": r.course_id, "rating": r.rating} for r in ratings]

    def get_average_rating(self, course_id: int) -> Dict[str, Any]:
        result = self.db.query(
            func.avg(Rating.rating).label("average"),
            func.count(Rating.id).label("count"),
        ).filter(
            Rating.course_id == course_id, Rating.deleted_at.is_(None)
        ).one()

        average = round(float(result.average), 2) if result.average is not None else None
        return {"average_rating": average, "rating_count": result.count}