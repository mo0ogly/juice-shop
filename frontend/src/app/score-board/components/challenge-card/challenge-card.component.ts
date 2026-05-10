import { Component, Input, type OnInit, inject, type OnChanges, type SimpleChanges, ViewChild, HostBinding, signal } from '@angular/core'
import { EnrichedChallenge } from '../../types/EnrichedChallenge'
import { Config } from 'src/app/Services/configuration.service'
import { TranslateModule } from '@ngx-translate/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltip } from '@angular/material/tooltip'
import { NgClass } from '@angular/common'
import { DifficultyStarsComponent } from '../difficulty-stars/difficulty-stars.component'
import { SnackBarHelperService } from 'src/app/Services/snack-bar-helper.service'
import { MatDialog } from '@angular/material/dialog'
import { JuicelabPackService } from 'src/app/juicelab-overlay/services/juicelab-pack.service'
import { JuicelabCoachDialogComponent } from 'src/app/juicelab-overlay/coach-dialog/coach-dialog.component'

@Component({
  selector: 'challenge-card',
  templateUrl: './challenge-card.component.html',
  styleUrls: ['./challenge-card.component.scss'],
  imports: [DifficultyStarsComponent, MatTooltip, MatIconModule, NgClass, TranslateModule]
})
export class ChallengeCardComponent implements OnInit, OnChanges {
  private readonly snackBarHelperService = inject(SnackBarHelperService)
  private readonly dialog = inject(MatDialog)
  private readonly juicelabPackService = inject(JuicelabPackService)
  readonly isTdChallenge = signal(false)

  @HostBinding('class.juicelab-td')
  get juicelabTdHostClass(): boolean {
    return this.isTdChallenge()
  }

  @Input()
  public challenge: EnrichedChallenge

  @Input()
  public openCodingChallengeDialog: (challengeKey: string) => void

  @Input()
  public repeatChallengeNotification: (challengeKey: string) => void

  @Input()
  public unlockHint: (hintId: number, challengeKey?: string) => void

  @Input()
  public applicationConfiguration: Config

  @Input()
  public lastUnlockedChallengeKey: string | null = null

  @ViewChild('hintTooltip')
  public hintTooltip?: MatTooltip

  @ViewChild('codingChallengeTooltip')
  public codingChallengeTooltip?: MatTooltip

  @Input()
  public highlightCodingButton = false

  @Input()
  @HostBinding('attr.id')
  public challengeId?: string

  private previousHintsUnlocked?: number

  public hasInstructions: (challengeName: string) => boolean = () => false
  public startHackingInstructorFor: (challengeName: string) => Promise<void> = async () => {}

  async ngOnInit () {
    const { hasInstructions, startHackingInstructorFor } = await import('../../../../hacking-instructor')
    this.hasInstructions = hasInstructions
    this.startHackingInstructorFor = startHackingInstructorFor
    this.juicelabPackService.getTdKeySet().subscribe({
      next: (keys) => this.isTdChallenge.set(keys.has(this.challenge?.key)),
      error: () => this.isTdChallenge.set(false),
    })
  }

  openCoach (): void {
    if (!this.challenge?.key) return
    this.dialog.open(JuicelabCoachDialogComponent, {
      data: {
        challengeKey: this.challenge.key,
        challengeName: this.challenge.name,
        challengeDescription: this.challenge.description,
        challengeCategory: this.challenge.category,
        challengeDifficulty: this.challenge.difficulty,
      },
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'juicelab-coach-dialog-panel',
      autoFocus: false,
    })
  }

  ngOnChanges (changes: SimpleChanges): void {
    if (changes['challenge']?.currentValue) {
      const currentHintsUnlocked = this.challenge?.hintsUnlocked
      if (
        this.lastUnlockedChallengeKey === this.challenge?.key &&
        this.previousHintsUnlocked !== undefined &&
        currentHintsUnlocked !== this.previousHintsUnlocked
      ) {
        queueMicrotask(() => setTimeout(()=>{this.hintTooltip?.show()}, 50))
      }
      this.previousHintsUnlocked = currentHintsUnlocked
    }

    if (changes['highlightCodingButton']) {
      if (changes['highlightCodingButton'].currentValue === true) {
        queueMicrotask(() => {
          setTimeout(() => {
            this.codingChallengeTooltip?.show()
          }, 1000)
        })
      } else if (changes['highlightCodingButton'].previousValue === true && changes['highlightCodingButton'].currentValue === false) {
        this.codingChallengeTooltip?.hide()
      }
    }
  }

  copyPayload (event: MouseEvent) {
    const target = event.target as HTMLElement
    const codeElement = target.closest('code')
    if (codeElement) {
      const text = codeElement.innerText
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.snackBarHelperService.open('COPY_SUCCESS', 'confirmBar')
        })
      }
    }
  }
}