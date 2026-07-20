import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = new URL("../", import.meta.url);

test("container routes bubblewrap through the dedicated host profile", async () => {
  const [dockerfile, wrapper, entrypoint, compose, apparmor] = await Promise.all([
    readFile(new URL("Dockerfile", base), "utf8"),
    readFile(new URL("bin/bwrap", base), "utf8"),
    readFile(new URL("bin/entrypoint", base), "utf8"),
    readFile(new URL("compose.yaml", base), "utf8"),
    readFile(new URL("security/apparmor/seo-audit-container", base), "utf8"),
  ]);

  assert.match(dockerfile, /apparmor-utils/);
  assert.match(dockerfile, /COPY internal-app\/bin\/bwrap \/usr\/local\/bin\/bwrap/);
  assert.match(dockerfile, /ENTRYPOINT \["\/usr\/local\/bin\/seo-audit-entrypoint"\]/);
  assert.match(wrapper, /aa-exec -p bwrap -- \/usr\/bin\/bwrap/);
  assert.match(entrypoint, /setpriv --no-new-privs -- "\$@"/);
  assert.match(apparmor, /change_profile -> bwrap/);
  assert.match(apparmor, /profile seoauditcontainer/);
  assert.match(compose, /apparmor=seoauditcontainer/);
  assert.match(compose, /seccomp=\.\.\/seoaudit\.json/);
  assert.doesNotMatch(compose, /seccomp=unconfined/);
});

test("custom seccomp remains default-deny and opens only namespace primitives", async () => {
  const profile = JSON.parse(
    await readFile(new URL("../seoaudit.json", base), "utf8"),
  );
  const expected = [
    "clone",
    "clone3",
    "mount",
    "pivot_root",
    "setns",
    "umount",
    "umount2",
    "unshare",
  ];

  assert.equal(profile.defaultAction, "SCMP_ACT_ERRNO");
  assert.equal(profile.syscalls[0].action, "SCMP_ACT_ALLOW");
  assert.deepEqual(profile.syscalls[0].names, expected);

  const duplicate = profile.syscalls
    .slice(1)
    .flatMap((rule) => rule.names || [])
    .filter((name) => expected.includes(name));
  assert.deepEqual(duplicate, []);
});
