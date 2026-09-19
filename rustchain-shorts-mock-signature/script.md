# Script

**Target duration:** 50–58 seconds

**Hook:**  
What happens if a test-only signature shortcut reaches production?

RustChain keeps a mock-signature mode for development, but its own config labels that mode insecure and production-disabled.

The important part is the startup guard.

When the production WSGI app loads the RustChain node, it immediately calls `enforce_mock_signature_runtime_guard()` before normal app startup continues.

RustChain also ships regression tests for the boundary: mock signatures are allowed in a test runtime, rejected in production, and WSGI startup is checked to ensure the guard is actually wired in.

I reproduced those tests against the public RustChain repository in GitHub Actions: three tests ran, three passed.

That is the pattern you want for dangerous test switches: useful in development, impossible to enable silently in production.

**End card:**  
Test convenience should never become production trust.
