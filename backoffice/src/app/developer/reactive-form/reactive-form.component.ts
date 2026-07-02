import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FORM_CONFIG } from './reactive-form.config';

@Component({
  selector: 'app-reactive-form',
  templateUrl: './reactive-form.component.html',
  styleUrls: ['./reactive-form.component.scss'],
})
export class ReactiveFormComponent implements OnInit, AfterViewInit {
  contactForm!: FormGroup;
  config = FORM_CONFIG;

  @ViewChild('formContainer', { static: false }) formContainer!: ElementRef;

  constructor(private fb: FormBuilder, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      company: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10,15}$')]],
      message: [''],
    });
  }

  ngAfterViewInit(): void {
    // Use setTimeout to ensure DOM is stable
    setTimeout(() => {
      this.applyFormConfig();
    }, 0);
  }

  applyFormConfig(): void {
    if (!this.formContainer) return;

    const formElement = this.formContainer.nativeElement.querySelector('form');
    if (!formElement) return;

    const fieldRows = Array.from(
      formElement.querySelectorAll('.row.mb-3')
    ) as HTMLElement[];

    // Map label "for" attributes → form row
    const fieldMap: Record<string, HTMLElement> = {};
    fieldRows.forEach((row) => {
      const label = row.querySelector('label');
      const key = label?.getAttribute('for');
      if (key) fieldMap[key] = row;
    });

    // 1️⃣ Hide all fields initially
    Object.values(fieldMap).forEach((row) => {
      this.renderer.setStyle(row, 'display', 'none');
    });

    // 2️⃣ Append visible fields in order
    this.config.forEach((cfg) => {
      const fieldEl = fieldMap[cfg.key];
      if (!fieldEl) return;
      if (cfg.visible) {
        this.renderer.setStyle(fieldEl, 'display', '');
        formElement.appendChild(fieldEl); // moves existing node to correct position
      }
    });

    // 3️⃣ Append hidden fields (if needed) at end (optional)
    Object.entries(fieldMap).forEach(([key, row]) => {
      const cfg = this.config.find((c) => c.key === key);
      if (!cfg) {
        // hide anything not mentioned in config
        this.renderer.setStyle(row, 'display', 'none');
      }
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      console.log('Form Submitted:', this.contactForm.value);
    } else {
      this.contactForm.markAllAsTouched();
    }
  }
}
