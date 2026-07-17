# Customization layer

`instructions.md` is appended to every audit. Put company terminology, report structure, ownership rules, and quality standards there.

If a deeper change to one upstream skill is unavoidable, place only the replacement files under `skill-overrides/` using the same path they have at the repository root. For example:

```text
skill-overrides/
  skills/
    seo-technical/
      SKILL.md
```

Overrides are copied into each disposable audit workspace after the upstream files. Keep them small and review an override whenever the same upstream skill changes.
