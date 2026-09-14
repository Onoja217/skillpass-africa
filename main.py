from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, Base, get_db

Base.metadata.create_all(bind=engine)
app = FastAPI()

@app.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.get("/skills", response_model=list[schemas.SkillOut])
def search_skills(q: str | None = None, category_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Skill)
    if q:
        query = query.filter(models.Skill.name.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(models.Skill.category_id == category_id)
    return query.all()