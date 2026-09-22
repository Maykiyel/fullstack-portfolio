# PostgreSQL as the content source of truth

Managed Portfolio content is stored in PostgreSQL because Projects, Inquiries, Users, Technologies, Categories, and Media metadata form relational data that benefits from constraints and transactional persistence. The web application consumes this content through the API rather than maintaining a competing source of truth.
