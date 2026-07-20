# SEO audit host security profiles

Codex uses bubblewrap to enforce the per-audit filesystem and network permission profile. A normal Docker container blocks the namespace and mount syscalls bubblewrap needs, while Ubuntu AppArmor prevents an unrestricted container process from using unprivileged user namespaces.

The files in this directory expose only the outer-container primitives needed by bubblewrap:

- `apparmor/seo-audit-container` installs the hyphen-free `seoauditcontainer` profile, keeps Docker-style `/proc` and `/sys` restrictions, and permits an explicit transition to Ubuntu's `bwrap-userns-restrict` profile.
- `/seoaudit.json` installs as `/etc/docker/seccomp/seoaudit.json`. It is derived from Moby's default seccomp profile at commit `3c28324314729dbade8287e868eef6338c42807a`, keeps `SCMP_ACT_ERRNO` as the default, and additionally allows only `clone`, `clone3`, `mount`, `pivot_root`, `setns`, `umount`, `umount2`, and `unshare` for bubblewrap.
- `bin/entrypoint` sets the kernel `no_new_privs` bit on the application process, which every audit subprocess inherits.
- `install-host-profiles.sh` installs and reloads both profiles on an Ubuntu Docker host.

Install once on the Docker host:

```bash
sudo apt-get install apparmor-profiles apparmor-utils
sudo ./internal-app/security/install-host-profiles.sh
```

The production container must then use:

```text
--cap-drop ALL
--security-opt apparmor=seoauditcontainer
--security-opt seccomp=./seoaudit.json
--ulimit nproc=512:512
```

The names and paths used in Coolify's custom options intentionally contain no hyphens because its Docker-run-to-Compose parser truncates hyphenated values. The seccomp profile is at the repository root because Coolify runs Compose inside an isolated helper container, where host-absolute paths are unavailable. The upstream merge workflow preserves this fork-only file. For direct Docker Compose deployments, `compose.yaml` also sets Docker's `no-new-privileges:true`; in Coolify, the entrypoint provides the same inherited kernel restriction.

Do not replace the dedicated seccomp profile with `seccomp=unconfined`, and do not run the application as a privileged container.
