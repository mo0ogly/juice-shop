# Pedagogy Companion for OWASP Juice Shop

This fork of [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)
adds a non-invasive **pedagogical overlay** for academic and corporate
training labs.

> **Status** : standalone fork, no upstream PR yet. A public Discussion
> will be opened on the OWASP repo to gauge maintainer interest before
> any upstreaming attempt.

## What it adds

- **Briefing panel** : per-challenge OWASP-sourced mission + 3-4 concepts
  (CWE / OWASP Top 10 anchored).
- **Graduated hints** : 5 levels with fixed cost cohort 5 / 10 / 20 / 35 / 50
  percent of the per-challenge score.
- **Reflective journal** : before / after free text, persisted server-side
  with HMAC-signed proofs.
- **Quiz** : 3 multiple-choice questions per challenge, 4 options each,
  deterministic scoring.
- **Cohort workflow** : a teacher (instructor) creates a cohort on the
  companion dashboard, a student joins from the overlay with a cohort
  code, the teacher approves the request, events stream to the dashboard
  in real time.

## Non-invasive guarantees

- **Zero** native OWASP route, dataset, lib, or challenge file modified.
- **Zero** native vulnerability removed. The CTF surface is preserved as
  delivered upstream.
- All overlay code lives under
  `frontend/src/app/juicelab-overlay/` and its i18n keys are namespaced
  with the `JUICELAB_` prefix.
- The companion dashboard runs on a **separate process** (Flask + SQLite)
  and is opt-in : Juice Shop functions normally without it.

## Scope of the fork

This fork is intended for **defensive security education**. It does not
provide new attack vectors. The pedagogical overlay only adds didactic
material around the existing OWASP Top 10 challenges already designed by
the Juice Shop maintainers.

## Trilingual support

The overlay inherits the active Juice Shop language. Strings are
maintained in **FR / EN / BR** under `frontend/src/assets/i18n/`.

## Pack format (YAML v2)

Pedagogical content is stored as YAML under
`frontend/src/assets/juicelab/{briefing,journal}/` and
`data/juicelab-private/{hints,quiz}/` :

```yaml
challenge_key: "loginAdminChallenge"
schema_version: "juicelab.briefing.v2"
mission_fr: |
  ...
mission_en: |
  ...
concepts:
  - title_fr: "..."
    title_en: "..."
    body_fr: |
      ...
    body_en: |
      ...
```

Schema v2 is documented in `.claude/rules/owasp-pedagogy-companion.md`
of the fork.

## Companion dashboard

The teacher-side dashboard (Flask) lives in a separate repository and
exposes `/admin/cohorts`, `/admin/students`, and a live matrix at
`/dashboard`. The student overlay posts events to `POST /api/sync` with
a per-cohort gate (`pending` / `validated` / `rejected`).

## Upstream attribution

OWASP Juice Shop is a [Flagship project](https://owasp.org/projects/) of
the OWASP Foundation, created and maintained by
[Bjoern Kimminich](https://github.com/bkimminich) and many
contributors. This fork does not claim authorship of Juice Shop itself ;
it only adds a thin overlay on top of the unchanged platform.

## License

Same as upstream Juice Shop : MIT. See `LICENSE`.
