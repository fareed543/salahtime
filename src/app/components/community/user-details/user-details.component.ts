import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  loading = false;
  userData: any = null;
  imagePath = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthApiService
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = rawId ? Number(rawId) : 0;
    if (!id) {
      this.errorMessage = 'User id is missing.';
      return;
    }

    this.loading = true;
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
