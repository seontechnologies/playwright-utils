# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the latest version.

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please help us maintain the security of this project and its users by reporting it responsibly.

### How to Report

**Please do NOT open a public issue for security vulnerabilities.**

Instead, please use one of the following methods:

1. **GitHub Security Advisories** (Recommended)
   - Go to https://github.com/seontechnologies/playwright-utils/security/advisories/new
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

2. **Email**
   - Contact: murat.ozcan@seon.io
   - Include detailed information about the vulnerability
   - Provide steps to reproduce if possible

### What to Include

When reporting a security vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations (if you have them)

### Response Timeline

You can expect:

- **Initial Response**: Within 48 hours of your report
- **Status Updates**: Regular updates on our progress (at least weekly)
- **Resolution**: We aim to address critical vulnerabilities within 7 days
- **Credit**: We will credit you for responsible disclosure (if desired) in our release notes

## Security Best Practices

When using this library:

- **Keep dependencies up to date**: Regularly update to the latest version
- **Never commit credentials**: Use environment variables for sensitive configuration
- **Review test data**: Ensure test files don't contain real credentials or sensitive data
- **Validate user input**: When using utilities that process user data, ensure proper validation
- **Follow principle of least privilege**: Only grant necessary permissions in your test environments

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as quickly as possible
5. Publicly disclose the vulnerability after the fix is released

## Security Updates

Security updates will be released as:

- Patch versions for minor vulnerabilities
- Minor versions for moderate vulnerabilities
- Major versions only if breaking changes are required

All security updates will be documented in [CHANGELOG.md](./CHANGELOG.md) and GitHub releases.

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue to discuss.
