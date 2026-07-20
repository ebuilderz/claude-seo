# SEO audit host security profiles

Codex uses bubblewrap to enforce the per-audit filesystem and network permission profile. A normal Docker container blocks the namespace and mount syscalls bubblewrap needs, while Ubuntu AppArmor prevents an unrestricted container process from using unprivileged user namespaces.

The files in this directory expose only the outer-container primitives needed by bubblewrap:

- `apparmor/seo-audit-container` keeps Docker-style `/proc` and `/sys` restrictions and permits an explicit transition to Ubuntu's `bwrap-userns-restrict` profile.
- `seccomp/seo-audit.json` is derived from Moby's default seccomp profile at commit `3c28324314729dbade8287e868eef6338c42807a`. It keeps `SCMP_ACT_ERRNO` as the default and additionally allows only `clone`, `clone3`, `mount`, `pivot_root`, `setns`, `umount`, `umount2`, and `unshare` for bubblewrap.
- `install-host-profiles.sh` installs and reloads both profiles on an Ubuntu Docker host.

Install once on the Docker host:

```bash
sudo apt-get install apparmor-profiles apparmor-utils
sudo ./internal-app/security/install-host-profiles.sh
```

The production container must then use:

```text
--cap-drop ALL
--security-opt no-new-privileges:true
--security-opt apparmor=seo-audit-container
--security-opt seccomp=/etc/docker/seccomp/seo-audit.json
```

Do not replace the dedicated seccomp profile with `seccomp=unconfined`, and do not run the application as a privileged container.
