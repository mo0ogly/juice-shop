/*
 * juicelab-overlay - Cohort join dialog
 *
 * UX-driven cohort onboarding. The student enters the dashboard URL, the
 * cohort code given by the teacher, and their email. Submitting POSTs
 * /api/cohort/join on the dashboard ; the prof then approves or rejects
 * the request from /admin/cohorts. The sync service polls
 * /api/student/status every minute and suspends event upload while the
 * request is pending or rejected.
 *
 * This dialog is the single configuration entry point on the student
 * side : there is no /assets/juicelab/config.json edit any more. The
 * baked config.json is still loaded as a default for the dashboard URL
 * and cohort id fields when localStorage is empty.
 *
 * SPDX-License-Identifier: MIT
 */

import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'
import { catchError, of } from 'rxjs'

import { JuicelabStateService } from '../services/juicelab-state.service'

const COHORT_RE = /^[A-Za-z0-9._-]{1,64}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s]{1,256}$/

@Component({
  selector: 'juicelab-cohort-join-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="join-overlay" *ngIf="open">
      <div class="join-card">
        <header>
          <h2>{{ 'JUICELAB_JOIN_TITLE' | translate }}</h2>
          <button type="button" class="close" (click)="onCancel()" *ngIf="dismissable" aria-label="close">x</button>
        </header>
        <p class="intro">{{ 'JUICELAB_JOIN_INTRO' | translate }}</p>

        <label>
          <span>{{ 'JUICELAB_JOIN_DASHBOARD_URL' | translate }}</span>
          <input type="url" [(ngModel)]="dashboardUrl" placeholder="http://127.0.0.1:5050" autocomplete="off">
          <small>{{ 'JUICELAB_JOIN_DASHBOARD_URL_HINT' | translate }}</small>
        </label>

        <label>
          <span>{{ 'JUICELAB_JOIN_COHORT_ID' | translate }}</span>
          <input type="text" [(ngModel)]="cohortId" autocomplete="off" maxlength="64">
          <small>{{ 'JUICELAB_JOIN_COHORT_HINT' | translate }}</small>
        </label>

        <label>
          <span>{{ 'JUICELAB_JOIN_EMAIL' | translate }}</span>
          <input type="email" [(ngModel)]="email" autocomplete="off" maxlength="254">
          <small>{{ 'JUICELAB_JOIN_EMAIL_HINT' | translate }}</small>
        </label>

        <div class="error" *ngIf="errorKey">{{ errorKey | translate }}</div>

        <div class="actions">
          <button type="button" class="submit" (click)="onSubmit()" [disabled]="submitting">
            {{ 'JUICELAB_JOIN_SUBMIT' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(15, 23, 42, 0.72);
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .join-card {
      background: #ffffff; color: #1f2937;
      width: min(420px, 92vw); padding: 24px 28px; border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.32);
    }
    .join-card header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .join-card h2 { margin: 0; font-size: 19px; }
    .join-card .close {
      background: transparent; border: none; font-size: 20px;
      cursor: pointer; color: #6b7280; padding: 0 4px;
    }
    .join-card .close:hover { color: #1f2937; }
    .join-card .intro { margin: 0 0 16px; color: #4b5563; font-size: 14px; }
    .join-card label {
      display: block; margin-bottom: 12px; font-size: 13px;
    }
    .join-card label > span { display: block; font-weight: 500; margin-bottom: 4px; }
    .join-card input {
      width: 100%; box-sizing: border-box; padding: 8px 10px;
      border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;
      font-family: inherit; color: #1f2937;
    }
    .join-card input:focus { outline: none; border-color: #0e7490; }
    .join-card small { display: block; color: #6b7280; font-size: 11px; margin-top: 4px; }
    .join-card .error {
      background: #fef2f2; color: #991b1b;
      padding: 8px 10px; border-radius: 6px; font-size: 13px; margin: 8px 0 12px;
      border: 1px solid #fecaca;
    }
    .join-card .actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .join-card .submit {
      background: #0e7490; color: #fff; border: none; padding: 9px 18px;
      border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .join-card .submit:hover:not(:disabled) { background: #155e75; }
    .join-card .submit:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class CohortJoinDialogComponent {
  @Input() open = false
  @Input() dismissable = false
  @Input() initialDashboardUrl = ''
  @Input() initialCohortId = ''
  @Output() readonly closed = new EventEmitter<void>()
  @Output() readonly joined = new EventEmitter<void>()

  private readonly http = inject(HttpClient)
  private readonly stateSvc = inject(JuicelabStateService)

  dashboardUrl = ''
  cohortId = ''
  email = ''
  errorKey = ''
  submitting = false

  ngOnChanges(): void {
    if (!this.open) return
    const cur = this.stateSvc.join()
    if (cur.dashboard_url) this.dashboardUrl = cur.dashboard_url
    else if (this.initialDashboardUrl) this.dashboardUrl = this.initialDashboardUrl
    if (cur.cohort_id) this.cohortId = cur.cohort_id
    else if (this.initialCohortId) this.cohortId = this.initialCohortId
    if (cur.email) this.email = cur.email
  }

  onCancel(): void {
    if (!this.dismissable) return
    this.errorKey = ''
    this.closed.emit()
  }

  onSubmit(): void {
    const url = (this.dashboardUrl || '').trim().replace(/\/+$/, '')
    const cohort = (this.cohortId || '').trim()
    const email = (this.email || '').trim().toLowerCase()

    if (!URL_RE.test(url) || !COHORT_RE.test(cohort) || !EMAIL_RE.test(email)) {
      this.errorKey = 'JUICELAB_JOIN_ERR_INVALID'
      return
    }

    this.submitting = true
    this.errorKey = ''
    const localState = this.stateSvc.state()
    const token = localState.student.token || crypto.randomUUID()

    this.http.post(`${url}/api/cohort/join`, {
      cohort_id: cohort,
      student_token: token,
      email,
      dashboard_url: url,
    }).pipe(
      catchError((err) => {
        if (err?.status === 404) this.errorKey = 'JUICELAB_JOIN_ERR_UNKNOWN_COHORT'
        else if (err?.status === 400) this.errorKey = 'JUICELAB_JOIN_ERR_INVALID'
        else this.errorKey = 'JUICELAB_JOIN_ERR_NETWORK'
        return of(null)
      }),
    ).subscribe((resp) => {
      this.submitting = false
      if (!resp) return
      // Seed the student.token in localStorage so subsequent events use it.
      if (!localState.student.token) {
        this.stateSvc.ensureStudent(cohort, localState.student.language || 'fr')
      }
      this.stateSvc.setJoin(url, cohort, email)
      this.joined.emit()
    })
  }
}
