/*
 * juicelab-overlay - Badges display
 * Tiered medals with per-badge progress hint and theme-safe colors.
 * SPDX-License-Identifier: MIT
 */

import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { TranslateModule } from '@ngx-translate/core'

import { type Badge, type LocalState } from '../models/juicelab.types'
import { BADGES, JuicelabBadgeEngineService } from '../services/juicelab-badge-engine.service'
import { JuicelabStateService } from '../services/juicelab-state.service'

type Tier = 'recon' | 'grit' | 'meta' | 'apex'

interface DecoratedBadge extends Badge {
  earned: boolean
  tier: Tier
  progressFr: string
  progressEn: string
  done: number
  total: number
  pct: number
  tierLabel: string
  tierIcon: string
}

const DJ1_KEYS = [
  'scoreBoardChallenge',
  'privacyPolicyChallenge',
  'directoryListingChallenge',
  'exposedCredentialsChallenge',
  'passwordHashLeakChallenge',
]
const ALL_KEYS = [
  ...DJ1_KEYS,
  'loginAdminChallenge',
  'adminSectionChallenge',
  'basketAccessChallenge',
  'feedbackChallenge',
  'localXssChallenge',
  'reflectedXssChallenge',
  'xssBonusChallenge',
  'bullyChatbotChallenge',
]

@Component({
  selector: 'juicelab-badges-display',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <mat-card class="badges-display">
      <mat-card-title class="badges-title">
        <span class="badges-title-badge" aria-hidden="true">
          <mat-icon class="badges-title-icon">workspace_premium</mat-icon>
        </span>
        <span class="badges-title-text">{{ 'JUICELAB_BADGES_TITLE' | translate }}</span>
      </mat-card-title>
      <mat-card-content>
        <div class="grid">
          <div
            *ngFor="let badge of decorated()"
            class="badge"
            [class.earned]="badge.earned"
            [attr.data-tier]="badge.tier"
            [matTooltip]="(language() === 'fr' ? badge.description_fr : badge.description_en)"
            matTooltipPosition="above"
          >
            <div class="tier-pill">
              <mat-icon class="tier-pill-icon">{{ badge.tierIcon }}</mat-icon>
              <span class="tier-pill-text">{{ badge.tierLabel }}</span>
            </div>
            <div class="medal" [style.--pct]="badge.pct + '%'">
              <div class="medal-ring"></div>
              <div class="medal-progress"></div>
              <div class="medal-core">
                <mat-icon class="icon">{{ badge.icon }}</mat-icon>
              </div>
              <mat-icon class="lock" *ngIf="!badge.earned">lock</mat-icon>
              <mat-icon class="tick" *ngIf="badge.earned">verified</mat-icon>
            </div>
            <div class="meta">
              <div class="label">{{ language() === 'fr' ? badge.label_fr : badge.label_en }}</div>
              <div class="desc">{{ language() === 'fr' ? badge.description_fr : badge.description_en }}</div>
              <div class="progress-bar" *ngIf="!badge.earned" [attr.aria-label]="badge.done + ' / ' + badge.total">
                <div class="progress-bar-fill" [style.width.%]="badge.pct"></div>
                <span class="progress-bar-text">{{ badge.done }} / {{ badge.total }} <span class="pct">({{ badge.pct }}%)</span></span>
              </div>
              <div class="progress" *ngIf="!badge.earned">
                <span class="chip">{{ language() === 'fr' ? badge.progressFr : badge.progressEn }}</span>
              </div>
              <div class="progress" *ngIf="badge.earned">
                <span class="chip earned-chip">
                  <mat-icon class="chip-icon">check_circle</mat-icon>
                  {{ 'JUICELAB_BADGE_EARNED' | translate }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    :host { display: block; color: inherit; }
    .badges-display { max-width: 720px; margin: 16px 0; color: inherit; }
    .badges-title { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
    .badges-title-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
      background: linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #db2777 100%);
      box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
      position: relative; overflow: hidden;
    }
    .badges-title-badge::after {
      content: ""; position: absolute; inset: 0; border-radius: 12px;
      background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.4), transparent 55%);
      pointer-events: none;
    }
    .badges-title-icon {
      font-size: 26px; width: 26px; height: 26px; line-height: 26px; color: #ffffff;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
    }
    .badges-title-text {
      background: linear-gradient(90deg, #fbbf24, #f97316, #db2777);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
      font-weight: 700; letter-spacing: 0.3px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    @media (max-width: 540px) { .grid { grid-template-columns: 1fr; } }

    .badge {
      position: relative;
      display: flex;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
      overflow: hidden;
    }
    .badge::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 12% 0%, var(--tier-color, transparent) 0%, transparent 35%);
      opacity: 0;
      transition: opacity 220ms ease;
      pointer-events: none;
    }
    .badge:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.18);
    }
    .badge:hover::before { opacity: 0.18; }

    .badge.earned {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border-color: var(--tier-color);
      box-shadow:
        0 0 0 1px var(--tier-color) inset,
        0 12px 36px -10px var(--tier-color),
        0 0 24px -4px color-mix(in srgb, var(--tier-color) 60%, transparent);
    }
    .badge.earned::before { opacity: 0.28; }
    .badge.earned::after {
      content: ""; position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 0%, transparent 38%,
        color-mix(in srgb, var(--tier-color) 22%, transparent) 50%,
        transparent 62%, transparent 100%);
      transform: translateX(-100%);
      animation: shine 4.2s ease-in-out 1.2s infinite;
      pointer-events: none;
    }
    @keyframes shine {
      0% { transform: translateX(-100%); }
      40% { transform: translateX(100%); }
      100% { transform: translateX(100%); }
    }

    /* Tier accent palette - bright + secondary for gradients */
    .badge[data-tier="recon"] { --tier-color: #38bdf8; --tier-color-2: #6366f1; }
    .badge[data-tier="grit"]  { --tier-color: #fb923c; --tier-color-2: #f43f5e; }
    .badge[data-tier="meta"]  { --tier-color: #c084fc; --tier-color-2: #ec4899; }
    .badge[data-tier="apex"]  { --tier-color: #fbbf24; --tier-color-2: #f97316; }

    .badge { padding-top: 28px; }
    .tier-pill {
      position: absolute; top: 8px; left: 12px;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px 2px 6px; border-radius: 999px;
      font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
      background: linear-gradient(90deg, var(--tier-color), var(--tier-color-2));
      color: #0b0f17;
      box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--tier-color) 70%, transparent);
      z-index: 2;
    }
    .tier-pill-icon { font-size: 12px; width: 12px; height: 12px; line-height: 12px; }
    .tier-pill-text { line-height: 1; }

    .medal {
      position: relative;
      width: 76px;
      height: 76px;
      flex: 0 0 76px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      transition: transform 240ms ease;
      --pct: 0%;
    }
    .medal-progress {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background:
        conic-gradient(var(--tier-color) 0%, var(--tier-color-2) var(--pct, 0%), rgba(127, 127, 127, 0.15) var(--pct, 0%));
      mask: radial-gradient(circle, transparent 60%, #000 62%);
      -webkit-mask: radial-gradient(circle, transparent 60%, #000 62%);
      transition: --pct 600ms ease;
    }
    .medal-core {
      position: relative;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.18), transparent 55%),
        radial-gradient(circle at 70% 80%, rgba(0, 0, 0, 0.35), transparent 60%),
        linear-gradient(135deg, color-mix(in srgb, var(--tier-color) 35%, #0b0f17), color-mix(in srgb, var(--tier-color-2) 30%, #0b0f17));
      border: 1.5px solid color-mix(in srgb, var(--tier-color) 50%, transparent);
      box-shadow: inset 0 -6px 14px rgba(0, 0, 0, 0.35);
    }
    .badge.earned .medal {
      transform: rotate(-3deg) scale(1.04);
    }
    .badge.earned .medal-core {
      background:
        radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.55), transparent 45%),
        radial-gradient(circle at 70% 78%, rgba(0, 0, 0, 0.4), transparent 55%),
        linear-gradient(135deg, var(--tier-color), var(--tier-color-2));
      border-color: var(--tier-color);
      box-shadow:
        inset 0 -8px 16px rgba(0, 0, 0, 0.42),
        0 0 18px color-mix(in srgb, var(--tier-color) 55%, transparent);
      animation: pulse-glow 2.8s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: inset 0 -8px 16px rgba(0, 0, 0, 0.42), 0 0 18px color-mix(in srgb, var(--tier-color) 55%, transparent); }
      50%      { box-shadow: inset 0 -8px 16px rgba(0, 0, 0, 0.42), 0 0 28px color-mix(in srgb, var(--tier-color) 85%, transparent); }
    }
    .medal-ring {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 1px dashed transparent;
      pointer-events: none;
    }
    .badge.earned .medal-ring {
      border-color: color-mix(in srgb, var(--tier-color) 70%, transparent);
      animation: spin 14s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      opacity: 0.85;
      color: rgba(255, 255, 255, 0.92);
      transition: opacity 200ms ease, transform 240ms ease;
    }
    .badge.earned .icon {
      opacity: 1;
      color: #ffffff;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
    }

    .lock, .tick {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 18px;
      width: 22px;
      height: 22px;
      line-height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      z-index: 1;
    }
    .lock {
      background: rgba(0, 0, 0, 0.78);
      color: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .tick {
      background: var(--tier-color);
      color: #0b0f17;
      border: 1px solid rgba(0, 0, 0, 0.45);
    }

    .meta { min-width: 0; flex: 1; }
    .label {
      font-weight: 800;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
      font-size: 16px;
      background: linear-gradient(90deg, var(--tier-color), var(--tier-color-2));
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .desc {
      font-size: 12px;
      line-height: 1.45;
      opacity: 0.75;
      margin-bottom: 8px;
    }
    .progress-bar {
      position: relative;
      height: 16px;
      border-radius: 999px;
      background: rgba(127, 127, 127, 0.18);
      overflow: hidden;
      margin-bottom: 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .progress-bar-fill {
      position: absolute; inset: 0 auto 0 0;
      background: linear-gradient(90deg, var(--tier-color), var(--tier-color-2));
      box-shadow: 0 0 10px color-mix(in srgb, var(--tier-color) 60%, transparent);
      transition: width 480ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .progress-bar-text {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
      mix-blend-mode: normal;
    }
    .progress-bar-text .pct { opacity: 0.85; margin-left: 4px; font-weight: 500; }
    .progress { display: flex; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: inherit;
      font-weight: 600;
      letter-spacing: 0.3px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .badge[data-tier="recon"] .chip { border-color: color-mix(in srgb, var(--tier-color) 50%, transparent); }
    .badge[data-tier="grit"]  .chip { border-color: color-mix(in srgb, var(--tier-color) 50%, transparent); }
    .badge[data-tier="meta"]  .chip { border-color: color-mix(in srgb, var(--tier-color) 50%, transparent); }
    .badge[data-tier="apex"]  .chip { border-color: color-mix(in srgb, var(--tier-color) 50%, transparent); }
    .earned-chip {
      background: var(--tier-color);
      color: #0b0f17;
      border-color: var(--tier-color);
    }
    .chip-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
  `],
})
export class BadgesDisplayComponent {
  private readonly stateSvc = inject(JuicelabStateService)
  private readonly engine = inject(JuicelabBadgeEngineService)

  readonly language = computed(() => this.stateSvc.state().student.language)

  readonly decorated = computed<DecoratedBadge[]>(() => {
    const state = this.stateSvc.state()
    const earned = new Set(state.badges_earned)
    return BADGES.map(b => {
      const tier = this.tierOf(b.key)
      const fract = this.fraction(b.key, state)
      const pct = fract.total > 0 ? Math.min(100, Math.round((fract.done / fract.total) * 100)) : 0
      return {
        ...b,
        earned: earned.has(b.key),
        tier,
        progressFr: this.progressFr(b.key, state),
        progressEn: this.progressEn(b.key, state),
        done: fract.done,
        total: fract.total,
        pct,
        tierLabel: this.tierLabel(tier),
        tierIcon: this.tierIcon(tier),
      }
    })
  })

  private tierLabel(t: Tier): string {
    switch (t) {
      case 'recon': return 'BRONZE'
      case 'grit':  return 'SILVER'
      case 'meta':  return 'GOLD'
      case 'apex':  return 'PLATINUM'
    }
  }
  private tierIcon(t: Tier): string {
    switch (t) {
      case 'recon': return 'military_tech'
      case 'grit':  return 'shield'
      case 'meta':  return 'auto_awesome'
      case 'apex':  return 'emoji_events'
    }
  }
  private fraction(key: string, state: LocalState): { done: number, total: number } {
    if (key === 'recon_master') return { done: this.solvedCount(state, DJ1_KEYS), total: 5 }
    if (key === 'apex')         return { done: this.solvedCount(state, ALL_KEYS), total: 13 }
    if (key === 'perseverant')  return { done: this.solvedCount(state, ALL_KEYS), total: 13 }
    if (key === 'metacognitif') return { done: this.journalReadyCount(state, ALL_KEYS), total: 13 }
    return { done: 0, total: 1 }
  }

  ngOnInit(): void {
    this.engine.reevaluateAll()
  }

  private tierOf(key: string): Tier {
    switch (key) {
      case 'recon_master': return 'recon'
      case 'perseverant': return 'grit'
      case 'metacognitif': return 'meta'
      case 'apex': return 'apex'
      default: return 'recon'
    }
  }

  private solvedCount(state: LocalState, keys: string[]): number {
    return keys.reduce((n, k) => n + (state.challenges[k]?.solved_at ? 1 : 0), 0)
  }

  private hintCount(state: LocalState, keys: string[]): number {
    return keys.reduce((n, k) => n + (state.challenges[k]?.hints_consumed.length ?? 0), 0)
  }

  private journalReadyCount(state: LocalState, keys: string[]): number {
    return keys.reduce((n, k) => {
      const text = state.challenges[k]?.journal.after_solve ?? ''
      return n + (text.split(/\s+/).filter(Boolean).length > 50 ? 1 : 0)
    }, 0)
  }

  private progressFr(key: string, state: LocalState): string {
    if (key === 'recon_master') {
      const solved = this.solvedCount(state, DJ1_KEYS)
      const hints = this.hintCount(state, DJ1_KEYS)
      return `DJ1 ${solved}/5 - ${hints} indices`
    }
    if (key === 'apex') {
      const solved = this.solvedCount(state, ALL_KEYS)
      const hints = this.hintCount(state, ALL_KEYS)
      return `${solved}/13 - ${hints} indices`
    }
    if (key === 'perseverant') {
      const solved = this.solvedCount(state, ALL_KEYS)
      const hints = this.hintCount(state, ALL_KEYS)
      return `${solved}/13 - ${hints} indices (>30)`
    }
    if (key === 'metacognitif') {
      const ready = this.journalReadyCount(state, ALL_KEYS)
      return `${ready}/13 journaux >50 mots`
    }
    return 'A faire'
  }

  private progressEn(key: string, state: LocalState): string {
    if (key === 'recon_master') {
      const solved = this.solvedCount(state, DJ1_KEYS)
      const hints = this.hintCount(state, DJ1_KEYS)
      return `DJ1 ${solved}/5 - ${hints} hints`
    }
    if (key === 'apex') {
      const solved = this.solvedCount(state, ALL_KEYS)
      const hints = this.hintCount(state, ALL_KEYS)
      return `${solved}/13 - ${hints} hints`
    }
    if (key === 'perseverant') {
      const solved = this.solvedCount(state, ALL_KEYS)
      const hints = this.hintCount(state, ALL_KEYS)
      return `${solved}/13 - ${hints} hints (>30)`
    }
    if (key === 'metacognitif') {
      const ready = this.journalReadyCount(state, ALL_KEYS)
      return `${ready}/13 journals >50 words`
    }
    return 'Pending'
  }
}
