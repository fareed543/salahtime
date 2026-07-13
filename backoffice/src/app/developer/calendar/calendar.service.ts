import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environment/environment';

export interface AdminCalendarAdjustment {
  id: number;
  title: string;
  hijriYear: number;
  hijriMonth: number;
  originalStartDate: string;
  originalEndDate: string;
  updatedStartDate: string;
  updatedEndDate: string;
  startDate: string;
  endDate: string;
  adjustmentDays: number;
  notes: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCalendarAdjustmentResponse {
  items: AdminCalendarAdjustment[];
}

export interface AdminCalendarSpecialDate {
  id: number;
  title: string;
  eventDate: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCalendarSpecialDateResponse {
  items: AdminCalendarSpecialDate[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getAdjustments(): Observable<AdminCalendarAdjustmentResponse> {
    return this.http.get<AdminCalendarAdjustmentResponse>(
      `${environment.apiUrl}admin/calendar-adjustments`,
      { headers: this.buildAuthHeaders() }
    );
  }

  saveAdjustments(items: AdminCalendarAdjustment[]): Observable<AdminCalendarAdjustmentResponse> {
    return this.http.post<AdminCalendarAdjustmentResponse>(
      `${environment.apiUrl}admin/save-calendar-adjustments`,
      { items },
      { headers: this.buildAuthHeaders() }
    );
  }

  getSpecialDates(): Observable<AdminCalendarSpecialDateResponse> {
    return this.http.get<AdminCalendarSpecialDateResponse>(
      `${environment.apiUrl}admin/calendar-special-dates`,
      { headers: this.buildAuthHeaders() }
    );
  }

  saveSpecialDates(items: AdminCalendarSpecialDate[]): Observable<AdminCalendarSpecialDateResponse> {
    return this.http.post<AdminCalendarSpecialDateResponse>(
      `${environment.apiUrl}admin/save-calendar-special-dates`,
      { items },
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
