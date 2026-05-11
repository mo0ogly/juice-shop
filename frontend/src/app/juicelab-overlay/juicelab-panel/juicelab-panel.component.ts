/*
 * juicelab-overlay - Main panel container
 * Selects a challenge from the TD parcours and orchestrates child components.
 * SPDX-License-Identifier: MIT
 */

import { CommonModule } from '@angular/common'
import { Component, OnDestroy, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatTabsModule } from '@angular/material/tabs'
import { Router, RouterModule } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'

import { type SelectedChallenge } from '../models/juicelab.types'
import { JuicelabAuthService } from '../services/juicelab-auth.service'
import { JuicelabBridgeService } from '../services/juicelab-bridge.service'
import { JuicelabPackService } from '../services/juicelab-pack.service'
import { JuicelabStateService } from '../services/juicelab-state.service'
import { JuicelabSyncService } from '../services/juicelab-sync.service'
import { BadgesDisplayComponent } from '../badges-display/badges-display.component'
import { BriefingPanelComponent } from '../briefing-panel/briefing-panel.component'
import { CohortJoinDialogComponent } from '../cohort-join-dialog/cohort-join-dialog.component'
import { HelpDialogComponent } from '../help-dialog/help-dialog.component'
import { HintsPanelComponent } from '../hints-panel/hints-panel.component'
import { JournalFormComponent } from '../journal-form/journal-form.component'
import { QuizFormComponent } from '../quiz-form/quiz-form.component'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'juicelab-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatTabsModule,
    TranslateModule,
    BriefingPanelComponent,
    CohortJoinDialogComponent,
    HelpDialogComponent,
    HintsPanelComponent,
    JournalFormComponent,
    QuizFormComponent,
    BadgesDisplayComponent,
  ],
  template: `
    <div class="panel-root">
      <juicelab-cohort-join-dialog
        [open]="joinDialogOpen()"
        [dismissable]="joinStatus() !== 'unconfigured'"
        [initialDashboardUrl]="bakedDashboardUrl"
        [initialCohortId]="bakedCohortId"
        (closed)="onJoinDialogClosed()"
        (joined)="onJoinDialogJoined()"
      ></juicelab-cohort-join-dialog>

      <juicelab-help-dialog
        [open]="helpDialogOpen()"
        (closed)="helpDialogOpen.set(false)"
      ></juicelab-help-dialog>

      <h1>
        <mat-icon>school</mat-icon>
        Coach pedagogique JuiceLab
        <button mat-icon-button class="join-settings-btn" (click)="helpDialogOpen.set(true)"
                [title]="'JUICELAB_HELP_TITLE' | translate"
                aria-label="JuiceLab help">
          <mat-icon>help_outline</mat-icon>
        </button>
        <button mat-icon-button class="join-settings-btn" (click)="openJoinDialog()"
                [title]="'JUICELAB_JOIN_SETTINGS_REOPEN' | translate"
                aria-label="Cohort settings">
          <mat-icon>settings</mat-icon>
        </button>
      </h1>
      <p class="intro">
        Plateforme d accompagnement pour le TD Juice Shop. Choisis un challenge,
        consulte les indices gradues, remplis ton journal de bord, valide le quiz.
      </p>

      <div class="join-banner" *ngIf="joinBannerKey()">
        <mat-icon class="join-banner-icon">{{ joinBannerIcon() }}</mat-icon>
        <span class="join-banner-text">{{ joinBannerKey() | translate }}</span>
        <span class="join-banner-meta" *ngIf="joinSummary()">{{ joinSummary() }}</span>
      </div>

      <mat-card *ngIf="!isAuthenticated()" class="auth-banner">
        <mat-card-content>
          <div class="auth-row">
            <mat-icon class="auth-icon">lock_person</mat-icon>
            <div class="auth-text">
              <div class="auth-title">Connecte-toi a Juice Shop</div>
              <div class="auth-desc">
                Les indices, le quiz et le journal sont reserves aux comptes
                authentifies. Etapes :
              </div>
              <ol class="auth-steps">
                <li>Bouton "Account" en haut a droite -&gt; Login (ou Register puis Login).</li>
                <li>Saisir email + mot de passe et cliquer "Log in".</li>
                <li>Revenir ici, le panneau bascule automatiquement.</li>
              </ol>
              <div class="auth-diag">
                Diagnostic : token = <strong>{{ tokenDiag() }}</strong>
              </div>
            </div>
            <div class="auth-actions">
              <button mat-flat-button color="primary" routerLink="/login">
                <mat-icon>login</mat-icon>
                Aller au login
              </button>
              <button mat-stroked-button (click)="recheckAuth()">
                <mat-icon>refresh</mat-icon>
                J ai login
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <ng-container *ngIf="isAuthenticated()">
        <mat-form-field appearance="outline">
          <mat-label>Challenge en cours</mat-label>
          <mat-select [(ngModel)]="selectedKey">
            <mat-select-trigger>{{ selectedName() }}</mat-select-trigger>
            <mat-optgroup *ngFor="let dj of djs()" [label]="'DJ' + dj">
              <mat-option *ngFor="let c of byDj()[dj]" [value]="c.key">
                {{ c.position }}. {{ c.name_official }}
              </mat-option>
            </mat-optgroup>
          </mat-select>
        </mat-form-field>

        <ng-container *ngIf="selectedKey">
          <mat-tab-group>
            <mat-tab [label]="'JUICELAB_TAB_BRIEFING' | translate">
              <juicelab-briefing-panel
                [challengeKey]="selectedKey"
                [challengeName]="selectedChallengeName()"
                [challengeCategory]="selectedChallengeCategory()"
                [challengeDifficulty]="selectedChallengeDifficulty()"
              ></juicelab-briefing-panel>
            </mat-tab>
            <mat-tab [label]="'JUICELAB_TAB_HINTS' | translate">
              <juicelab-hints-panel [challengeKey]="selectedKey"></juicelab-hints-panel>
            </mat-tab>
            <mat-tab [label]="'JUICELAB_TAB_AFTER' | translate">
              <juicelab-journal-form
                [challengeKey]="selectedKey"
                [challengeName]="selectedChallengeName()"
                [challengeCategory]="selectedChallengeCategory()"
                [challengeDifficulty]="selectedChallengeDifficulty()"
                phase="after"
              ></juicelab-journal-form>
            </mat-tab>
            <mat-tab [label]="'JUICELAB_TAB_QUIZ' | translate">
              <juicelab-quiz-form [challengeKey]="selectedKey"></juicelab-quiz-form>
            </mat-tab>
          </mat-tab-group>
        </ng-container>

        <juicelab-badges-display></juicelab-badges-display>
      </ng-container>
    </div>
  `,
  styles: [`
    .panel-root { max-width: 900px; margin: 24px auto; padding: 16px; color: inherit; }
    h1 { display: flex; gap: 8px; align-items: center; margin: 0 0 8px; color: inherit; }
    .intro { opacity: 0.75; margin-bottom: 16px; }
    mat-form-field { width: 100%; max-width: 480px; margin-bottom: 16px; }
    .auth-banner {
      margin: 0 0 16px;
      border: 1px solid #fbbf24;
      background: rgba(251, 191, 36, 0.08);
    }
    .auth-row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
    .auth-icon { font-size: 36px; width: 36px; height: 36px; color: #fbbf24; }
    .auth-text { flex: 1; min-width: 240px; }
    .auth-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    .auth-desc { font-size: 13px; opacity: 0.8; line-height: 1.45; }
    .auth-steps { font-size: 13px; opacity: 0.85; margin: 6px 0; padding-left: 18px; line-height: 1.6; }
    .auth-diag {
      font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      font-size: 12px; opacity: 0.75; margin-top: 6px;
    }
    .auth-actions { display: flex; flex-direction: column; gap: 8px; min-width: 160px; }
    .join-settings-btn { margin-left: auto; opacity: 0.6; }
    .join-settings-btn:hover { opacity: 1; }
    .join-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      border: 1px solid rgba(14, 116, 144, 0.4);
      background: rgba(14, 116, 144, 0.08);
      font-size: 13px; margin-bottom: 16px;
    }
    .join-banner.rejected {
      border-color: rgba(185, 28, 28, 0.4);
      background: rgba(185, 28, 28, 0.08);
    }
    .join-banner-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .join-banner-meta {
      margin-left: auto; font-size: 11px; opacity: 0.7;
      font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    }
  `],
})
export class JuicelabPanelComponent implements OnDestroy {
  private readonly packSvc = inject(JuicelabPackService)
  private readonly stateSvc = inject(JuicelabStateService)
  private readonly syncSvc = inject(JuicelabSyncService)
  private readonly bridgeSvc = inject(JuicelabBridgeService)
  private readonly authSvc = inject(JuicelabAuthService)
  private readonly router = inject(Router)

  selectedKey = ''
  readonly isAuthenticated = this.authSvc.isAuthenticated
  private authPoll: ReturnType<typeof setInterval> | null = null

  bakedDashboardUrl = ''
  bakedCohortId = ''
  readonly joinDialogOpen = signal(false)
  readonly helpDialogOpen = signal(false)
  readonly joinStatus = computed(() => this.stateSvc.join().status)
  readonly joinSummary = computed(() => {
    const j = this.stateSvc.join()
    if (!j.cohort_id) return ''
    return `${j.cohort_id} @ ${j.dashboard_url}`
  })
  readonly joinBannerKey = computed(() => {
    switch (this.joinStatus()) {
      case 'pending':   return 'JUICELAB_JOIN_STATUS_PENDING'
      case 'rejected':  return 'JUICELAB_JOIN_STATUS_REJECTED'
      case 'unknown':   return 'JUICELAB_JOIN_STATUS_UNKNOWN'
      case 'validated': return ''
      default:          return ''
    }
  })
  readonly joinBannerIcon = computed(() => this.joinStatus() === 'rejected' ? 'block' : 'hourglass_top')

  tokenDiag(): string {
    const snap = this.authSvc.tokenSnapshot()
    if (!snap) return 'absent (localStorage.token = null)'
    if (snap.length <= 20) return `trop court (len=${snap.length}, head=${snap.head})`
    return `present (len=${snap.length}, head=${snap.head})`
  }

  readonly challenges = toSignal(
    this.packSvc.getSelectedChallenges(),
    { initialValue: [] as SelectedChallenge[] },
  )

  readonly byDj = computed(() => {
    const buckets: Record<number, SelectedChallenge[]> = {}
    for (const c of this.challenges()) {
      buckets[c.demi_journee] ??= []
      buckets[c.demi_journee].push(c)
    }
    for (const dj of Object.keys(buckets)) {
      buckets[+dj].sort((a, b) => a.position - b.position)
    }
    return buckets
  })

  readonly djs = computed(() => Object.keys(this.byDj()).map(Number).sort())

  readonly selectedName = computed(() => {
    if (!this.selectedKey) return 'Choisir un challenge'
    const c = this.challenges().find(x => x.key === this.selectedKey)
    return c ? `DJ${c.demi_journee} - ${c.name_official}` : this.selectedKey
  })

  private readonly selectedMeta = computed(() =>
    this.challenges().find(x => x.key === this.selectedKey),
  )

  readonly selectedChallengeName = computed(() => this.selectedMeta()?.name_official ?? '')
  readonly selectedChallengeCategory = computed(() => this.selectedMeta()?.category ?? '')
  readonly selectedChallengeDifficulty = computed(() => this.selectedMeta()?.difficulty ?? 0)

  ngOnInit(): void {
    // Idempotent : wires the Juice Shop core 'challenge solved' socket
    // listener, only on the first call across the whole session.
    this.bridgeSvc.start()
    this.packSvc.getConfig().subscribe({
      next: (cfg) => {
        this.bakedDashboardUrl = cfg.dashboard_url || ''
        this.bakedCohortId = cfg.cohort_id || ''
        const join = this.stateSvc.join()
        // First launch : student has not filled the cohort-join-dialog
        // yet. We deliberately do NOT call ensureStudent() here so the
        // overlay does not seed a stale cohort_id from the baked config
        // before the user has confirmed it via the modal. The dialog
        // takes care of seeding student.token + state.cohort on submit.
        if (join.status === 'unconfigured') {
          this.joinDialogOpen.set(true)
        } else {
          this.stateSvc.ensureStudent(join.cohort_id || cfg.cohort_id, cfg.default_language)
          this.syncSvc.configure(cfg.dashboard_url, cfg.instance_label)
        }
      },
      error: () => {
        // Even if config.json is missing, the student can still configure
        // a dashboard URL manually via the join dialog.
        this.joinDialogOpen.set(true)
      },
    })
    // Poll the Juice Shop login token every 2s so the panel switches
    // to the authenticated layout as soon as the student finishes login
    // in another tab or via the navbar.
    this.authPoll = setInterval(() => this.authSvc.recheck(), 2000)
  }

  ngOnDestroy(): void {
    if (this.authPoll) clearInterval(this.authPoll)
  }

  recheckAuth(): void {
    this.authSvc.recheck()
  }

  openJoinDialog(): void {
    this.joinDialogOpen.set(true)
  }

  onJoinDialogClosed(): void {
    this.joinDialogOpen.set(false)
  }

  onJoinDialogJoined(): void {
    this.joinDialogOpen.set(false)
    // After the join request is registered server-side, configure the
    // sync service with the override URL + cohort. The polling loop will
    // pick up the 'validated' transition without a reload.
    const join = this.stateSvc.join()
    this.syncSvc.configure(join.dashboard_url, this.bakedInstanceLabelFallback())
  }

  private bakedInstanceLabelFallback(): string {
    // The baked config.json instance_label survives across cohorts, so we
    // can reuse the last value the pack service has loaded.
    return ''
  }
}
