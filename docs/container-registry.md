# Container Registry Operations Guide

This guide documents how to authenticate, publish, and consume Docker/OCI images with GitHub Container Registry (`ghcr.io`).

## Supported image formats

`ghcr.io` accepts:

- Docker Image Manifest V2, Schema 2
- OCI image format

It also supports foreign layers (for example, Windows image layers).

## Authentication model

You must authenticate to read private packages and to push/delete packages.

### Recommended for GitHub Actions: `GITHUB_TOKEN`

Use `GITHUB_TOKEN` in workflows whenever possible.

Benefits:

- Short-lived token managed by GitHub
- Repository-scoped permissions
- Avoids long-lived personal token exposure in CI

> [!IMPORTANT]
> `GITHUB_TOKEN` can publish packages for the workflow repository, but cross-repo package access still requires explicit package permissions (or a PAT when required).

### Personal access token (classic)

GitHub Packages authentication uses a personal access token (classic).

Use the minimum scope needed:

- `read:packages` → pull images / read metadata
- `write:packages` → push images / write metadata
- `delete:packages` → delete images

If your org uses SSO enforcement, enable SSO on the token.

```bash
export CR_PAT=YOUR_TOKEN
```

```bash
echo "$CR_PAT" | docker login ghcr.io -u USERNAME --password-stdin
```

## Publish workflow

### 1) Build

```bash
docker build -t my-image:latest .
```

### 2) Tag for GHCR namespace

```bash
docker tag my-image:latest ghcr.io/NAMESPACE/my-image:latest
```

### 3) Push

```bash
docker push ghcr.io/NAMESPACE/my-image:latest
```

You can publish additional version tags the same way:

```bash
docker push ghcr.io/NAMESPACE/my-image:2.5
```

## Pull workflow

### Pull by tag

```bash
docker pull ghcr.io/NAMESPACE/my-image:latest
```

### Pull by digest (immutable)

```bash
docker pull ghcr.io/NAMESPACE/my-image@sha256:<digest>
```

Pulling by digest is preferred for reproducible deployments.

## Repository linkage and metadata

When pushing from CLI, images are not always linked to a repository automatically. Add OCI labels so package metadata is clear and repository linkage is easier to manage.

Add these labels in your `Dockerfile`:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/OWNER/REPO"
LABEL org.opencontainers.image.description="Short package description"
LABEL org.opencontainers.image.licenses="MIT"
```

You can also inject labels at build time:

```bash
docker build \
  --label "org.opencontainers.image.source=https://github.com/OWNER/REPO" \
  --label "org.opencontainers.image.description=Short package description" \
  --label "org.opencontainers.image.licenses=MIT" \
  -t ghcr.io/NAMESPACE/my-image:latest .
```

## Multi-arch image description

For multi-architecture manifests, set description metadata via OCI manifest annotations (for example, `org.opencontainers.image.description`) so the package page shows the expected description.

## Operational limits / troubleshooting

- Maximum layer size: **10 GB**
- Upload timeout: **10 minutes**

Common fixes:

- Split very large layers
- Reduce build context (`.dockerignore`)
- Push smaller, cache-friendly layers
- Retry from a stable network path

## Quick security checklist

- Prefer `GITHUB_TOKEN` in Actions where possible
- Use least-privilege PAT scopes when a PAT is required
- Avoid sharing long-lived PATs between repositories
- Pin production deployments to image digests
- Add OCI source/description/license labels for traceability
