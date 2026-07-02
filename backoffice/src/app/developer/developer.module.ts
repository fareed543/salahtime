import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeveloperComponent } from './developer.component';
import { RouterModule, Routes } from '@angular/router';
import { MenuComponent } from './menu/menu.component';
import { PageComponent } from './page/page.component';
import { FormComponent } from './form/form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReactiveFormComponent } from './reactive-form/reactive-form.component';

const routes: Routes = [
  {
    path: '',
    component: DeveloperComponent ,
    children : [
        {
          path: 'reactive-form',
          component: ReactiveFormComponent 
        },
        {
          path: 'menu',
          component: MenuComponent 
        },
        {
          path: 'page',
          component: PageComponent 
        },
        {
          path: 'form',
          component: FormComponent 
        }
    ]
  }
];


@NgModule({
  declarations: [
    DeveloperComponent,
    MenuComponent,
    PageComponent,
    FormComponent,
    ReactiveFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FormsModule
  ]
})
export class DeveloperModule { }
