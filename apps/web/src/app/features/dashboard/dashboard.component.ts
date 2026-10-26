import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="header-title">
          <h1>Panel de Control - NSIAF v2</h1>
          <p>Sistema Integrado de Gestión de Activos Fijos y Almacenes</p>
        </div>
        <div class="badges">
          <mat-chip-set>
            <mat-chip highlighted color="primary">PostgreSQL 16</mat-chip>
            <mat-chip highlighted color="accent">NestJS API</mat-chip>
            <mat-chip highlighted>Angular 19</mat-chip>
            <mat-chip highlighted>Docker Ready</mat-chip>
          </mat-chip-set>
        </div>
      </header>

      <div class="grid">
        <mat-card class="card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">inventory_2</mat-icon>
            <mat-card-title>Activos Fijos</mat-card-title>
            <mat-card-subtitle>Bienes, custodia y depreciación</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Control integral de bienes muebles, códigos de barra, actas de asignación/devolución y depreciación con actualización por UFV.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary">Ver Activos</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">warehouse</mat-icon>
            <mat-card-title>Almacenes y Suministros</mat-card-title>
            <mat-card-subtitle>Stock y Kardex Físico-Valorado</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Gestión de notas de ingreso, solicitudes de funcionarios, salidas de materiales y kardex valorado (PEPS / Promedio ponderado).</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="accent">Ver Suministros</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="card">
          <mat-card-header>
            <mat-icon mat-card-avatar>description</mat-icon>
            <mat-card-title>Interoperabilidad Plantillas</mat-card-title>
            <mat-card-subtitle>Trazabilidad con CITE y firma digital</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Sincronización automatizada con el sistema Plantillas para vinculación directa de actas oficiales, CITEs y notas de entrega.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button>Configurar Conexión</button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1.5rem;
    }
    .header-title h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
    }
    .header-title p {
      color: #64748b;
      margin-top: 0.25rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .card {
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }
    mat-card-content {
      margin-top: 1rem;
      color: #334155;
      line-height: 1.5;
    }
    mat-card-actions {
      padding: 1rem !important;
    }
  `],
})
export class DashboardComponent {}
