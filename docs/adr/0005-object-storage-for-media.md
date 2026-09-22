# Object storage for Media assets

Project Media files are stored outside PostgreSQL in object storage while the database stores metadata and relationships. This avoids treating large binary files as relational data and leaves room for direct uploads and provider-specific delivery improvements later.
