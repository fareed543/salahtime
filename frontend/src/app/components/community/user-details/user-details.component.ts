import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit, OnChanges {
  @Input() userId: number | string | null = null;
  @Input() dialogMode = false;
  @Output() closed = new EventEmitter<void>();

  loading = false;
  userData: any = null;
  imagePath = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthApiService
  ) {}

  ngOnInit(): void {
    this.loadUser(this.resolveUserId());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.loadUser(this.resolveUserId());
    }
  }

  close(): void {
    this.closed.emit();
  }

  private resolveUserId(): number {
    const rawId = this.userId ?? this.route.snapshot.paramMap.get('id');
    return rawId ? Number(rawId) : 0;
  }

  private loadUser(id: number): void {
    if (!id) {
      this.errorMessage = 'User id is missing.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.userData = null;
    this.authService.getUserDetails(id).subscribe({
      next: (response) => {
        this.userData = response?.userData ?? null;
        this.imagePath = response?.imagePath ?? '';
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load user details right now.';
        this.loading = false;
      }
    });
  }
}
