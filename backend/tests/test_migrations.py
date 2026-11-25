import os
import tempfile
import pytest
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect


def test_alembic_clean_database_upgrade_and_downgrade():
    """Verify that a clean SQLite database can be migrated to head and downgraded cleanly."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        tmp_db_path = tmp_file.name

    # Close file handle so SQLite engine on Windows can open and remove it without sharing violations
    tmp_file.close()

    try:
        # Standardize path for SQLite URL (forward slashes)
        normalized_path = tmp_db_path.replace("\\", "/")
        tmp_db_url = f"sqlite:///{normalized_path}"

        # Setup alembic config pointing to disposable db
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", tmp_db_url)

        # Run upgrade to head
        command.upgrade(alembic_cfg, "head")

        # Inspect created tables in the disposable database
        engine = create_engine(tmp_db_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "alembic_version" in tables
        assert "users" in tables
        assert "user_profiles" in tables
        assert "user_skills" in tables
        assert "user_preferences" in tables

        # Verify columns on users table
        user_columns = [c["name"] for c in inspector.get_columns("users")]
        assert "hashed_password" in user_columns

        # Verify foreign keys on user_profiles
        fks = inspector.get_foreign_keys("user_profiles")
        assert len(fks) > 0
        assert fks[0]["referred_table"] == "users"

        engine.dispose()

        # Run downgrade to base
        command.downgrade(alembic_cfg, "base")

        engine2 = create_engine(tmp_db_url)
        inspector2 = inspect(engine2)
        tables_after_downgrade = inspector2.get_table_names()

        assert "users" not in tables_after_downgrade
        assert "user_profiles" not in tables_after_downgrade
        assert "user_skills" not in tables_after_downgrade
        assert "user_preferences" not in tables_after_downgrade

        engine2.dispose()
    finally:
        if os.path.exists(tmp_db_path):
            try:
                os.remove(tmp_db_path)
            except PermissionError:
                pass
