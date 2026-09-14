from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum
import datetime

class Role(str, enum.Enum):
    learner = "learner"
    mentor = "mentor"
    admin = "admin"

class SubmissionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    revision_requested = "revision_requested"
    verified = "verified"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(Role), default=Role.learner)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)  # Technology, Design, Fashion, Repairs, Business, Media, Agriculture

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category")

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    skill_id = Column(Integer, ForeignKey("skills.id"))
    instructions = Column(Text)
    difficulty = Column(String)       # e.g. "beginner", "intermediate", "advanced"
    deadline = Column(DateTime, nullable=True)
    criteria = Column(Text)
    created_by_id = Column(Integer, ForeignKey("users.id"))

    skill = relationship("Skill")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    learner_id = Column(Integer, ForeignKey("users.id"))

    written_response = Column(Text, nullable=True)
    project_link = Column(String, nullable=True)
    video_link = Column(String, nullable=True)

    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.draft)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    assessment = relationship("Assessment")

class SubmissionFile(Base):
    """One row per uploaded image/document, linked to a submission."""
    __tablename__ = "submission_files"
    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    file_path = Column(String)
    original_filename = Column(String)

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"
    id = Column(Integer, primary_key=True)
    learner_id = Column(Integer, ForeignKey("users.id"))
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    is_public = Column(Boolean, default=False)