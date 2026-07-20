#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root on the Docker host." >&2
  exit 1
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v apparmor_parser >/dev/null 2>&1; then
  echo "apparmor_parser is required (Ubuntu package: apparmor-utils)." >&2
  exit 1
fi

if [ ! -f /etc/apparmor.d/bwrap-userns-restrict ]; then
  source_profile=/usr/share/apparmor/extra-profiles/bwrap-userns-restrict
  if [ ! -f "$source_profile" ]; then
    echo "The distro bwrap-userns-restrict profile is missing (Ubuntu package: apparmor-profiles)." >&2
    exit 1
  fi
  install -m 0644 "$source_profile" /etc/apparmor.d/bwrap-userns-restrict
fi

install -m 0644 "$script_dir/apparmor/seo-audit-container" /etc/apparmor.d/seoauditcontainer
install -d -m 0755 /etc/docker/seccomp
install -m 0644 "$script_dir/seccomp/seoaudit.json" /etc/docker/seccomp/seoaudit.json

apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict
apparmor_parser -r /etc/apparmor.d/seoauditcontainer

echo "Installed seoauditcontainer AppArmor and seoaudit.json seccomp profiles."
