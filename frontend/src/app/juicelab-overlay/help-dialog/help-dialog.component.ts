/*
 * juicelab-overlay - Help dialog
 *
 * Read-only popup explaining: how to join a cohort, request statuses,
 * language switching, and how to reset registration. Trilingual via the
 * shared ngx-translate catalog (JUICELAB_HELP_* keys).
 *
 * SPDX-License-Identifier: MIT
 */

import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'juicelab-help-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="help-overlay" *ngIf="open">
      <div class="help-card">
        <header>
          <h2>{{ 'JUICELAB_HELP_TITLE' | translate }}</h2>
          <button type="button" class="close" (click)="onClose()" aria-label="close">x</button>
        </header>
        <div class="body">
          <h3>{{ 'JUICELAB_HELP_S1_TITLE' | translate }}</h3>
          <p class="intro">{{ 'JUICELAB_HELP_S1_INTRO' | translate }}</p>
          <ol>
            <li>{{ 'JUICELAB_HELP_S1_STEP_1' | translate }}</li>
            <li>{{ 'JUICELAB_HELP_S1_STEP_2' | translate }}</li>
            <li>{{ 'JUICELAB_HELP_S1_STEP_3' | translate }}</li>
            <li>{{ 'JUICELAB_HELP_S1_STEP_4' | translate }}</li>
          </ol>

          <h3>{{ 'JUICELAB_HELP_S2_TITLE' | translate }}</h3>
          <ul class="status-list">
            <li><span class="status-tag pending">pending</span> {{ 'JUICELAB_HELP_S2_PENDING' | translate }}</li>
            <li><span class="status-tag validated">validated</span> {{ 'JUICELAB_HELP_S2_VALIDATED' | translate }}</li>
            <li><span class="status-tag rejected">rejected</span> {{ 'JUICELAB_HELP_S2_REJECTED' | translate }}</li>
          </ul>

          <h3>{{ 'JUICELAB_HELP_S3_TITLE' | translate }}</h3>
          <p>{{ 'JUICELAB_HELP_S3_BODY' | translate }}</p>

          <h3>{{ 'JUICELAB_HELP_S4_TITLE' | translate }}</h3>
          <p>{{ 'JUICELAB_HELP_S4_BODY' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .help-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(15, 23, 42, 0.72);
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .help-card {
      background: #ffffff; color: #1f2937;
      width: min(560px, 92vw); max-height: 86vh; overflow-y: auto;
      padding: 24px 28px; border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.32);
    }
    .help-card header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
    }
    .help-card h2 { margin: 0; font-size: 19px; color: #0e7490; }
    .help-card .close {
      background: transparent; border: none; font-size: 22px;
      cursor: pointer; color: #6b7280; padding: 0 4px;
    }
    .help-card .close:hover { color: #1f2937; }
    .help-card h3 {
      margin: 14px 0 6px; font-size: 14px; color: #0e7490;
      font-weight: 600; letter-spacing: 0.01em;
    }
    .help-card h3:first-of-type { margin-top: 0; }
    .help-card p { margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: #1f2937; }
    .help-card p.intro { color: #4b5563; }
    .help-card ol { padding-left: 20px; margin: 4px 0 12px; }
    .help-card ol li { font-size: 13px; line-height: 1.6; color: #1f2937; margin-bottom: 6px; }
    .help-card ul.status-list { list-style: none; padding: 0; margin: 4px 0 12px; }
    .help-card ul.status-list li {
      font-size: 13px; line-height: 1.6; color: #1f2937; margin-bottom: 8px;
      display: flex; align-items: flex-start; gap: 8px;
    }
    .status-tag {
      padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500;
      letter-spacing: 0.01em; flex-shrink: 0; line-height: 1.7;
    }
    .status-tag.pending { background: #fef3c7; color: #92400e; }
    .status-tag.validated { background: #d1fae5; color: #065f46; }
    .status-tag.rejected { background: #fee2e2; color: #991b1b; }
  `],
})
export class HelpDialogComponent {
  @Input() open = false
  @Output() readonly closed = new EventEmitter<void>()

  onClose(): void {
    this.closed.emit()
  }
}
