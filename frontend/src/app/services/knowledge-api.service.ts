import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KnowledgeTag {
  id: number;
  code: string;
  name: string;
  status: number;
  sortOrder: number;
}

export interface KnowledgeHadith {
  id: number;
  title: string;
  arabicText: string;
  referenceSource: string;
  referenceLink: string;
  ruleType: string;
  isFarz: boolean;
  status: number;
  sortOrder: number;
  translations: Record<string, string>;
  tags: KnowledgeTag[];
  tagIds: number[];
}

export interface KnowledgeListResponse {
  tags: KnowledgeTag[];
  hadiths: KnowledgeHadith[];
}

@Injectable({
  providedIn: 'root'
})
export class KnowledgeApiService {
  constructor(private http: HttpClient) {}

  getKnowledge(filters?: { tags?: string[]; ruleType?: string; search?: string }): Observable<KnowledgeListResponse> {
    let params = new HttpParams();
    if (filters?.tags?.length) {
      params = params.set('tags', filters.tags.join(','));
    }
    if (filters?.ruleType) {
      params = params.set('ruleType', filters.ruleType);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<KnowledgeListResponse>(`${environment.apiUrl}http-knowledge/list`, { params });
  }

  getManageKnowledge(): Observable<KnowledgeListResponse> {
    return this.http.get<KnowledgeListResponse>(`${environment.apiUrl}http-knowledge/manage`);
  }

  saveHadith(payload: Partial<KnowledgeHadith> & { translations: Record<string, string>; tagIds: number[] }): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-knowledge/save-hadith`, payload);
  }

  deleteHadith(id: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-knowledge/delete-hadith`, { id });
  }

  saveTag(payload: Partial<KnowledgeTag>): Observable<any> {
    return this.http.post(`${environment.apiUrl}http-knowledge/save-tag`, payload);
  }
}
