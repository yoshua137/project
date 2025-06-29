import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-career-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Selecciona tu carrera</h3>
          <button 
            type="button" 
            class="text-gray-400 hover:text-gray-600"
            (click)="closeModal()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form [formGroup]="careerForm" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
              Departamento
            </label>
            <select 
              id="department"
              formControlName="department"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              (change)="onDepartmentChange()">
              <option value="">Seleccionar Departamento</option>
              <option value="Ciencias de la Salud">Ciencias de la Salud</option>
              <option value="Ingenieria y Ciencias Exactas">Ingeniería y Ciencias Exactas</option>
              <option value="Ciencias Sociales y Humanas">Ciencias Sociales y Humanas</option>
              <option value="Administracion y Economia">Administración y Economía</option>
            </select>
            <div *ngIf="careerForm.get('department')?.invalid && careerForm.get('department')?.touched" 
                 class="text-red-600 text-sm mt-1">
              El departamento es requerido.
            </div>
          </div>
          <div class="mb-4" *ngIf="careerForm.get('department')?.value">
            <label for="career" class="block text-sm font-medium text-gray-700 mb-2">
              Carrera
            </label>
            <select 
              id="career"
              formControlName="career"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar Carrera</option>
              <option *ngFor="let career of availableCareers" [value]="career">
                {{ career }}
              </option>
            </select>
            <div *ngIf="careerForm.get('career')?.invalid && careerForm.get('career')?.touched" 
                 class="text-red-600 text-sm mt-1">
              La carrera es requerida.
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button 
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              (click)="closeModal()">
              Cancelar
            </button>
            <button 
              type="submit"
              [disabled]="careerForm.invalid"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CareerModalComponent {
  @Output() careerSelected = new EventEmitter<string>();
  @Output() modalClosed = new EventEmitter<void>();

  careerForm: FormGroup;
  availableCareers: string[] = [];

  allDepartments = [
    {
      name: 'Ciencias de la Salud',
      value: 'Ciencias de la Salud',
      careers: ['Medicina', 'Enfermeria', 'Odontologia', 'Kinesiologia y Fisioterapia']
    },
    {
      name: 'Ingeniería y Ciencias Exactas',
      value: 'Ingenieria y Ciencias Exactas',
      careers: ['Arquitectura', 'Ingenieria Ambiental', 'Ingenieria Civil', 'Ingenieria Industrial', 'Ingenieria Quimica', 'Ingenieria Mecatronica', 'Ingenieria de Sistemas']
    },
    {
      name: 'Administración y Economía',
      value: 'Administracion y Economia',
      careers: ['Administracion de Empresas', 'Contaduria Publica (Auditoria)', 'Ingenieria Comercial', 'Ingenieria Empresarial', 'Ingenieria Financiera', 'Ingenieria en Comercio y Finanzas Internacionales']
    },
    {
      name: 'Ciencias Sociales y Humanas',
      value: 'Ciencias Sociales y Humanas',
      careers: ['Antropologia', 'Comunicacion Social', 'Diseno Digital Multimedia', 'Derecho', 'Filosofia y Letras', 'Psicologia']
    }
  ];

  constructor(private fb: FormBuilder) {
    this.careerForm = this.fb.group({
      department: ['', Validators.required],
      career: ['', Validators.required]
    });
  }

  onDepartmentChange() {
    const department = this.careerForm.get('department')?.value;
    if (department) {
      const found = this.allDepartments.find(d => d.value === department);
      this.availableCareers = found ? found.careers : [];
      this.careerForm.get('career')?.setValue('');
    } else {
      this.availableCareers = [];
    }
  }

  onSubmit() {
    if (this.careerForm.valid) {
      const career = this.careerForm.get('career')?.value;
      this.careerSelected.emit(career);
    }
  }

  closeModal() {
    this.modalClosed.emit();
  }
} 