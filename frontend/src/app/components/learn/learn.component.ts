import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, combineLatest, takeUntil } from 'rxjs';
import { AppTranslateService } from 'src/app/services/translate.service';
import { LearnDataService } from './learn-data.service';
import { LearnCollection, LearnEntry, LearnQuestion, LearnRuling, LearnText, LearnTopic } from './learn.model';

@Component({
  selector: 'app-learn',
  templateUrl: './learn.component.html',
  styleUrls: ['./learn.component.scss']
})
export class LearnComponent implements OnInit, OnDestroy {
  collection?: LearnCollection;
  topic?: LearnTopic;
  entry?: LearnEntry;
  language = 'en';
  view = 'library';
  filter: LearnRuling | 'all' = 'all';
  stepMode = false;
  loading = true;
  failed = false;
  notFound = false;
  imageFailed = false;
  questionIndex = 0;
  answers: Record<string, number> = {};
  readonly rulings: LearnRuling[] = ['farz', 'wajib', 'sunnah', 'mustahabb', 'nafl'];
  private readonly destroy$ = new Subject<void>();
  private loadSubscription?: Subscription;

  constructor(private route: ActivatedRoute, private data: LearnDataService, private i18n: AppTranslateService) {}

  ngOnInit(): void {
    this.i18n.currentLang$.pipe(takeUntil(this.destroy$)).subscribe(language => this.language = language);
    combineLatest([this.route.paramMap, this.route.queryParamMap, this.route.data])
      .pipe(takeUntil(this.destroy$)).subscribe(() => this.resolveRoute());
    this.load();
  }

  load(retry = false): void {
    this.loadSubscription?.unsubscribe();
    this.loading = true;
    this.failed = false;
    if (retry) this.data.retry();
    this.loadSubscription = this.data.getCollection().pipe(takeUntil(this.destroy$)).subscribe({
      next: collection => { this.collection = collection; this.loading = false; this.resolveRoute(); },
      error: () => { this.loading = false; this.failed = true; }
    });
  }

  private resolveRoute(): void {
    const previousTopic = this.topic?.id;
    this.view = this.route.snapshot.data['view'];
    this.topic = this.collection?.topics.find(topic => topic.id === this.route.snapshot.paramMap.get('topicId'));
    this.entry = this.topic?.entries.find(entry => entry.id === this.route.snapshot.paramMap.get('entryId'));
    const requested = this.route.snapshot.queryParamMap.get('filter') as LearnRuling;
    this.filter = this.availableRulings.includes(requested) ? requested : 'all';
    this.stepMode = this.route.snapshot.queryParamMap.get('mode') === 'steps';
    this.notFound = !!this.collection && (this.view !== 'library' && !this.topic || this.view === 'detail' && !this.entry || this.view === 'quiz' && !this.topic?.quiz.length);
    this.imageFailed = false;
    if (previousTopic !== this.topic?.id) this.restartQuiz();
  }

  text(value?: LearnText): string { return value?.[this.language] ?? value?.en ?? ''; }
  get availableRulings(): LearnRuling[] { return this.rulings.filter(ruling => this.actions.some(entry => entry.ruling === ruling)); }
  get actions(): LearnEntry[] { return this.topic?.entries.filter(entry => entry.kind === 'action') ?? []; }
  get guides(): LearnEntry[] { return this.topic?.entries.filter(entry => entry.kind === 'guide') ?? []; }
  get filteredActions(): LearnEntry[] { return this.actions.filter(entry => this.filter === 'all' || entry.ruling === this.filter); }
  get sequence(): LearnEntry[] { return (this.topic?.sequence ?? []).map(id => this.topic!.entries.find(entry => entry.id === id)!).filter(Boolean); }
  get detailEntries(): LearnEntry[] { return this.stepMode ? this.sequence : this.filteredActions; }
  get entryIndex(): number { return this.detailEntries.findIndex(entry => entry.id === this.entry?.id); }
  get previous(): LearnEntry | undefined { return this.entryIndex > 0 ? this.detailEntries[this.entryIndex - 1] : undefined; }
  get next(): LearnEntry | undefined { return this.entryIndex >= 0 ? this.detailEntries[this.entryIndex + 1] : undefined; }
  get related(): LearnEntry[] { return this.topic?.entries.filter(entry => this.entry?.related?.includes(entry.id)) ?? []; }
  get question(): LearnQuestion | undefined { return this.topic?.quiz[this.questionIndex]; }
  get answered(): boolean { return !!this.question && this.answers[this.question.id] !== undefined; }
  get score(): number { return this.topic?.quiz.filter(q => this.answers[q.id] === q.answer).length ?? 0; }
  get usesFallback(): boolean {
    if (this.language === 'en') return false;
    const texts = this.question && this.view === 'quiz' ? [this.question.question, ...this.question.options, this.question.explanation] : this.entry ? [this.entry.title, this.entry.summary, ...this.entry.steps, this.entry.note, this.entry.missed] : this.topic ? [this.topic.title, this.topic.summary, ...this.topic.entries.flatMap(e => [e.title,e.summary])] : this.collection?.topics.flatMap(t => [t.title,t.summary]) ?? [];
    return texts.some(text => !!text && !text[this.language]);
  }
  contentLanguage(value: LearnText): string { return value[this.language] ? this.language : 'en'; }
  contentDirection(value: LearnText): string { return this.i18n.isRtlLanguage(this.contentLanguage(value)) ? 'rtl' : 'ltr'; }
  chooseAnswer(index: number): void { if (this.question && !this.answered) this.answers[this.question.id] = index; }
  nextQuestion(): void { if (this.answered) this.questionIndex++; }
  restartQuiz(): void { this.questionIndex = 0; this.answers = {}; }
  trackId(_: number, item: { id: string }): string { return item.id; }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
