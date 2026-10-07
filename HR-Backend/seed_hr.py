import os
import sys
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to sys.path to allow importing the 'app' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import models, auth, database

import argparse
from sqlalchemy import create_engine

def seed_hr(db_url=None, seed_jobs=False):
    load_dotenv()
    
    if db_url:
        print("Connecting to custom database URL...")
        engine = create_engine(db_url)
    else:
        print("Connecting to default/env database...")
        engine = database.engine

    # Use the engine and ensure tables exist
    print("Ensuring tables exist...")
    database.Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. HR User
        hr_email = "hrautocratengineers@gmail.com"
        hr_password = "Hradmin@123"
        hr_role = "HR"

        existing_hr = db.query(models.User).filter(models.User.email == hr_email).first()
        hashed_pw = auth.get_password_hash(hr_password)
        if not existing_hr:
            print(f"Creating HR User {hr_email}...")
            new_hr = models.User(
                email=hr_email, 
                password_hash=hashed_pw, 
                role=models.UserRole.HR, 
                is_active=True
            )
            db.add(new_hr)
            db.commit()
            print("HR User created successfully.")
        else:
            print("HR User already exists. Updating password hash and role...")
            existing_hr.password_hash = hashed_pw
            existing_hr.role = models.UserRole.HR
            existing_hr.is_active = True
            db.commit()
            print("HR User updated successfully.")

        # 2. Seed Departments
        print("Checking for existing departments...")
        depts_to_seed = [
            "CNC", "VMC", "TMC", "Accounts", "Data Analyst", 
            "Dispatch", "Purchase", "Sales", "Quality", "Stores",
            "Software Development", "Human Resources", "Design", 
            "Product", "Marketing"
        ]
        
        dept_map = {}
        for dname in depts_to_seed:
            dept = db.query(models.Department).filter(models.Department.name == dname).first()
            if not dept:
                print(f"Creating department: {dname}")
                dept = models.Department(name=dname)
                db.add(dept)
                db.commit()
                db.refresh(dept)
            dept_map[dname] = dept.id
        print("Departments seeded successfully.")

    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database tables.")
    parser.add_argument("--db-url", help="Database connection URL to seed")
    args = parser.parse_args()
    
    seed_hr(db_url=args.db_url)
