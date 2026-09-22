# Cookie-based authentication sessions

The administration application uses secure HTTP-only cookie sessions through established authentication infrastructure rather than browser-managed bearer tokens or custom session cryptography. This keeps browser authentication straightforward while avoiding the risk and complexity of implementing security primitives ourselves.
