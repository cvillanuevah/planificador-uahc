import os
import uuid
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool

_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

# LAKEBASE_ENDPOINT injected by platform (valueFrom: postgres) — signals Databricks App mode
# LAKEBASE_INSTANCE is the instance name used for generate_database_credential
_LAKEBASE_ENDPOINT = os.environ.get("LAKEBASE_ENDPOINT") or os.environ.get("LAKEBASE_INSTANCE")
_LAKEBASE_INSTANCE = os.environ.get("LAKEBASE_INSTANCE") or _LAKEBASE_ENDPOINT

if _LAKEBASE_ENDPOINT:
    import psycopg2

    # Platform auto-injects PGHOST/PGPORT/PGDATABASE/PGUSER/PGSSLMODE for declared postgres resources
    # .env provides LAKEBASE_HOST/PORT/DB for local dev fallbacks
    _LB_HOST = os.environ.get("PGHOST") or os.environ.get("LAKEBASE_HOST", "")
    _LB_PORT = int(os.environ.get("PGPORT") or os.environ.get("LAKEBASE_PORT", "5432"))
    _LB_DB   = os.environ.get("PGDATABASE") or os.environ.get("LAKEBASE_DB", "postgres")
    _LB_SSL  = os.environ.get("PGSSLMODE", "require")

    from databricks.sdk import WorkspaceClient
    _sdk_client = WorkspaceClient()

    # Always use the SDK's app-owner identity for DB connections so all requests
    # share the same Lakebase user — avoids "permission denied" when the platform
    # injects PGUSER as the visiting user (different from the table owner).
    _LB_USER = os.environ.get("LAKEBASE_USER", "")
    if not _LB_USER:
        try:
            _LB_USER = _sdk_client.current_user.me().user_name or ""
        except Exception:
            pass
    if not _LB_USER:
        _LB_USER = os.environ.get("PGUSER", "token")

    def _get_lakebase_token():
        try:
            # SDK >= 0.40.0
            cred = _sdk_client.database.generate_database_credential(
                request_id=str(uuid.uuid4()),
                instance_names=[_LAKEBASE_INSTANCE],
            )
            return cred.token
        except AttributeError:
            # Fallback: raw REST API
            result = _sdk_client.api_client.do(
                "POST",
                "/api/2.0/database/credential",
                body={
                    "request_id": str(uuid.uuid4()),
                    "instance_names": [_LAKEBASE_INSTANCE],
                },
            )
            return result.get("token") or result.get("access_token", "")

    def _lakebase_creator():
        return psycopg2.connect(
            host=_LB_HOST,
            port=_LB_PORT,
            dbname=_LB_DB,
            user=_LB_USER,
            password=_get_lakebase_token(),
            sslmode=_LB_SSL,
        )

    engine = create_engine(
        "postgresql+psycopg2://",
        creator=_lakebase_creator,
        poolclass=NullPool,
    )
else:
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./planificador.db")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
