import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfiguracionService, ConfiguracionSistemaData } from '../../core/services/configuracion.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="config-container">
      <header class="config-header">
        <div class="header-titles">
          <div class="header-badge">
            <span class="material-icons">settings_suggest</span>
            <span>ADMINISTRACIÓN CENTRAL & GOBERNANZA</span>
          </div>
          <h1>Configuración Inicial del Sistema</h1>
          <p>
            Parámetros institucionales, régimen normativo, segregación de responsabilidades
            e integración SSO con Authentik.
          </p>
        </div>
      </header>

      @if (config(); as c) {
        <div class="config-grid">
          <!-- CARD 1: MODALIDAD DE ADMINISTRACIÓN Y RESPONSABLES -->
          <div class="config-card full-width">
            <div class="card-title">
              <span class="material-icons title-icon">supervisor_account</span>
              <div>
                <h3>Modalidad de Administración & Asignación de Responsables</h3>
                <p>
                  Configura si los módulos son operados por una sola persona o por encargados independientes con sus ayudantes.
                </p>
              </div>
            </div>

            <div class="modality-picker">
              <label class="modality-option" [class.selected]="modalidad === 'DESCENTRALIZADA'">
                <input
                  type="radio"
                  name="modalidad"
                  value="DESCENTRALIZADA"
                  [(ngModel)]="modalidad"
                />
                <div class="modality-content">
                  <div class="opt-head">
                    <span class="material-icons opt-icon">group_work</span>
                    <strong>Administración Descentralizada (Recomendado)</strong>
                  </div>
                  <p>
                    Dos personas distintas administran cada área: un Encargado de Activos Fijos y otro de Almacenes, cada uno con sus propios ayudantes (para despacho de vehículos, maquinaria, etc.). El encargado de activos solo ve activos, y el de almacenes solo almacenes.
                  </p>
                </div>
              </label>

              <label class="modality-option" [class.selected]="modalidad === 'UNIFICADA'">
                <input
                  type="radio"
                  name="modalidad"
                  value="UNIFICADA"
                  [(ngModel)]="modalidad"
                />
                <div class="modality-content">
                  <div class="opt-head">
                    <span class="material-icons opt-icon">person</span>
                    <strong>Administración Unificada</strong>
                  </div>
                  <p>
                    Un único responsable conjunto administra ambos módulos (Activos Fijos y Almacenes de Suministros).
                  </p>
                </div>
              </label>
            </div>

            <div class="responsables-form">
              <!-- Activos Fijos Responsable -->
              <div class="role-assign-box">
                <div class="box-head">
                  <span class="material-icons">inventory_2</span>
                  <h4>Módulo de Activos Fijos</h4>
                </div>
                <div class="form-group">
                  <label>Responsable Principal de Activos Fijos:</label>
                  <select [(ngModel)]="responsableActivosId" class="form-control">
                    <option value="">-- Seleccionar funcionario responsable --</option>
                    @for (u of c.usuariosDisponibles; track u.id) {
                      <option [value]="u.id">
                        {{ u.nombres }} {{ u.apellidos }} ({{ u.cargo || u.username }})
                      </option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Auxiliares / Ayudantes de Activos (Despacho vehículos, llantas, maquinaria):</label>
                  <mat-select
                    multiple
                    [(ngModel)]="auxiliaresActivosIds"
                    placeholder="Seleccionar auxiliares de activos"
                    class="form-control mat-select-custom"
                  >
                    @for (u of c.usuariosDisponibles; track u.id) {
                      <mat-option [value]="u.id">
                        {{ u.nombres }} {{ u.apellidos }} ({{ u.cargo || u.username }})
                      </mat-option>
                    }
                  </mat-select>
                </div>
              </div>

              <!-- Almacenes Responsable -->
              @if (modalidad === 'DESCENTRALIZADA') {
                <div class="role-assign-box">
                  <div class="box-head">
                    <span class="material-icons">warehouse</span>
                    <h4>Módulo de Almacenes y Suministros</h4>
                  </div>
                  <div class="form-group">
                    <label>Responsable Principal de Almacenes:</label>
                    <select [(ngModel)]="responsableAlmacenesId" class="form-control">
                      <option value="">-- Seleccionar funcionario responsable --</option>
                      @for (u of c.usuariosDisponibles; track u.id) {
                        <option [value]="u.id">
                          {{ u.nombres }} {{ u.apellidos }} ({{ u.cargo || u.username }})
                        </option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Auxiliares / Ayudantes de Almacenes (Recepción, estantería, despacho):</label>
                    <mat-select
                      multiple
                      [(ngModel)]="auxiliaresAlmacenesIds"
                      placeholder="Seleccionar auxiliares de almacén"
                      class="form-control mat-select-custom"
                    >
                      @for (u of c.usuariosDisponibles; track u.id) {
                        <mat-option [value]="u.id">
                          {{ u.nombres }} {{ u.apellidos }} ({{ u.cargo || u.username }})
                        </mat-option>
                      }
                    </mat-select>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- CARD 2: RÉGIMEN NORMATIVO Y DATOS INSTITUCIONALES -->
          <div class="config-card">
            <div class="card-title">
              <span class="material-icons title-icon">gavel</span>
              <div>
                <h3>Régimen Normativo e Institución</h3>
                <p>Marco legal para reportes contables y numeraciones oficiales.</p>
              </div>
            </div>

            <div class="form-group">
              <label>Nombre de la Entidad / Cooperativa:</label>
              <input
                type="text"
                [(ngModel)]="nombreEntidad"
                class="form-control"
                placeholder="Ej: Cooperativa de Servicios Telefónicos"
              />
            </div>

            <div class="form-group">
              <label>Sigla Institucional (Prefijo de Códigos):</label>
              <input
                type="text"
                [(ngModel)]="siglaEntidad"
                class="form-control"
                placeholder="Ej: ENT, COOP, ORG"
              />
            </div>

            <div class="form-group">
              <label>Marco Normativo de Contabilidad y Bienes:</label>
              <div class="radio-stack">
                <label class="radio-label">
                  <input type="radio" name="regimen" value="PUBLICO" [(ngModel)]="regimen" />
                  <div>
                    <strong>Público (Bolivia - Ley 1178 / D.S. 0181 / NB-SABS)</strong>
                    <small>Usa CITEs, actas oficiales, depreciación según D.S. 24051 y actualización por UFV.</small>
                  </div>
                </label>
                <label class="radio-label">
                  <input type="radio" name="regimen" value="PRIVADO" [(ngModel)]="regimen" />
                  <div>
                    <strong>Privado / Corporativo (NIIF / NIC 16)</strong>
                    <small>Gestión de activos con componentes, valuación WMS comercial y valor de recupero.</small>
                  </div>
                </label>
              </div>
            </div>

            <div class="toggle-group">
              <mat-slide-toggle [(ngModel)]="exigirCite" color="primary">
                <strong>Exigir Código CITE en todos los trámites</strong>
              </mat-slide-toggle>
              <small>Obligatorio para entidades estatales y auditorías de la Contraloría.</small>
            </div>
          </div>

          <!-- CARD 3: INTEGRACIÓN SSO AUTHENTIK -->
          <div class="config-card">
            <div class="card-title">
              <span class="material-icons title-icon">vpn_key</span>
              <div>
                <h3>Autenticación Centralizada SSO Authentik</h3>
                <p>Conexión directa con la infraestructura Authentik institucional.</p>
              </div>
            </div>

            <div class="toggle-group">
              <mat-slide-toggle [(ngModel)]="ssoHabilitado" color="primary">
                <strong>Habilitar SSO Authentik en pantalla de ingreso</strong>
              </mat-slide-toggle>
              <small>Permite auto-provisioning de cuentas con atributos LDAP / OIDC.</small>
            </div>

            <div class="form-group">
              <label>URL de Emisor Authentik (Issuer URL):</label>
              <input
                type="text"
                [(ngModel)]="authentikIssuerUrl"
                class="form-control"
                placeholder="https://auth.marabuntarl.com/application/o/intranet/"
              />
            </div>

            <div class="form-group">
              <label>URL LDAP Outpost:</label>
              <input
                type="text"
                [(ngModel)]="authentikLdapUrl"
                class="form-control"
                placeholder="ldap://localhost:389"
              />
            </div>

            <div class="form-group">
              <label>Client ID (OIDC):</label>
              <input
                type="text"
                [(ngModel)]="authentikClientId"
                class="form-control"
                placeholder="Ej: nsiaf-v2-client"
              />
            </div>

            <div class="sso-status-box">
              <span class="material-icons status-icon">cloud_done</span>
              <div>
                <strong>Compatibilidad Sicam / Plantillas / Intranet</strong>
                <p>Mapea automáticamente atributos uid, givenName, sn, mail y title (Cargo).</p>
              </div>
            </div>
          </div>

          <!-- CARD 4: CLASIFICADORES PRESUPUESTARIOS GESTIÓN 2027 (MEFP - RM Nº 271) -->
          <div class="config-card full-width">
            <div class="card-title">
              <span class="material-icons title-icon">menu_book</span>
              <div>
                <h3>Clasificadores Presupuestarios Oficiales Gestión 2027 (MEFP — RM Nº 271)</h3>
                <p>
                  Sincroniza de forma idempotente las partidas oficiales del <strong>Grupo 30000 (Materiales y Suministros)</strong> para Almacenes y del <strong>Grupo 40000 (Activos Reales)</strong> con vidas útiles D.S. 24051 para Activos Fijos.
                </p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:0.5rem;">
              <button
                mat-raised-button
                color="accent"
                type="button"
                (click)="sincronizarClasificadores2027()"
                [disabled]="isSyncing2027"
              >
                <mat-icon>sync</mat-icon>
                <span>{{ isSyncing2027 ? 'Sincronizando Catálogos 2027...' : 'Cargar / Actualizar Clasificadores Presupuestarios 2027' }}</span>
              </button>
              <a routerLink="/usuarios" mat-stroked-button color="primary">
                <mat-icon>group</mat-icon>
                <span>Ir a Gestión de Usuarios y Roles</span>
              </a>
              <a routerLink="/entidades" mat-stroked-button color="primary">
                <mat-icon>account_tree</mat-icon>
                <span>Ir a Entidades y Organigrama</span>
              </a>
            </div>
          </div>
        </div>

        <div class="config-actions">
          <button
            mat-raised-button
            color="primary"
            class="btn-save-config"
            (click)="guardarConfiguracion()"
            [disabled]="isSaving"
          >
            <mat-icon>save</mat-icon>
            <span>Guardar Parámetros y Aplicar Permisos</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .config-container {
      padding: 2rem;
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    .config-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #e0f2fe;
      color: #0369a1;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .header-badge .material-icons {
      font-size: 1rem;
    }

    .header-titles h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .header-titles p {
      color: #64748b;
      margin-top: 0.35rem;
      font-size: 0.92rem;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .config-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .config-card.full-width {
      grid-column: 1 / -1;
    }

    .card-title {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 1rem;
    }

    .title-icon {
      font-size: 2rem;
      color: #0284c7;
      background: #e0f2fe;
      padding: 0.4rem;
      border-radius: 10px;
    }

    .card-title h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-title p {
      font-size: 0.84rem;
      color: #64748b;
      margin: 0.2rem 0 0 0;
    }

    /* Modality Selector */
    .modality-picker {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .modality-option {
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      cursor: pointer;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      transition: all 0.2s;
    }

    .modality-option input {
      margin-top: 0.25rem;
    }

    .modality-option.selected {
      border-color: #0284c7;
      background: #f0f9ff;
    }

    .opt-head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.35rem;
    }

    .opt-icon {
      color: #0284c7;
      font-size: 1.25rem;
    }

    .modality-content strong {
      font-size: 0.95rem;
      color: #0f172a;
    }

    .modality-content p {
      font-size: 0.82rem;
      color: #475569;
      line-height: 1.45;
      margin: 0;
    }

    .responsables-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 0.5rem;
    }

    .role-assign-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.25rem;
    }

    .box-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      color: #0f172a;
    }

    .box-head h4 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #334155;
    }

    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }

    .mat-select-custom {
      padding: 0.4rem 0.85rem !important;
    }

    .radio-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .radio-label {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      cursor: pointer;
    }

    .radio-label strong {
      display: block;
      font-size: 0.88rem;
      color: #0f172a;
    }

    .radio-label small {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    .toggle-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem 0;
    }

    .toggle-group small {
      font-size: 0.76rem;
      color: #64748b;
      margin-left: 0.25rem;
    }

    .sso-status-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    .sso-status-box .status-icon {
      color: #16a34a;
      font-size: 1.5rem;
    }

    .sso-status-box strong {
      display: block;
      font-size: 0.84rem;
      color: #166534;
    }

    .sso-status-box p {
      font-size: 0.76rem;
      color: #15803d;
      margin: 0;
    }

    .config-actions {
      margin-top: 2rem;
      display: flex;
      justify-content: flex-end;
    }

    .btn-save-config {
      height: 48px;
      padding: 0 2rem;
      font-size: 0.95rem;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      .config-container {
        padding: 1rem 0.65rem;
      }
      .config-grid {
        grid-template-columns: 1fr;
      }
      .modality-picker {
        grid-template-columns: 1fr;
      }
      .responsables-form {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ConfiguracionComponent implements OnInit {
  config = signal<ConfiguracionSistemaData | null>(null);

  // Form Fields
  nombreEntidad = '';
  siglaEntidad = '';
  regimen: 'PUBLICO' | 'PRIVADO' = 'PUBLICO';
  modalidad: 'DESCENTRALIZADA' | 'UNIFICADA' = 'DESCENTRALIZADA';
  exigirCite = true;

  responsableActivosId = '';
  responsableAlmacenesId = '';
  auxiliaresActivosIds: string[] = [];
  auxiliaresAlmacenesIds: string[] = [];

  ssoHabilitado = true;
  authentikIssuerUrl = 'https://auth.marabuntarl.com/application/o/intranet/';
  authentikLdapUrl = 'ldap://localhost:389';
  authentikClientId = '';

  isSaving = false;
  isSyncing2027 = false;

  constructor(
    private configService: ConfiguracionService,
    public authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.configService.getConfiguracion().subscribe({
      next: (data) => {
        this.config.set(data);
        this.nombreEntidad = data.nombreEntidad || '';
        this.siglaEntidad = data.siglaEntidad || '';
        this.regimen = data.regimenNormativo || 'PUBLICO';
        this.modalidad = data.modalidadAdministracion || 'DESCENTRALIZADA';
        this.exigirCite = data.exigirCite ?? true;

        this.responsableActivosId = data.responsableActivosId || '';
        this.responsableAlmacenesId = data.responsableAlmacenesId || '';

        this.auxiliaresActivosIds = (data.auxiliaresActivos || []).map((u: any) => u.id);
        this.auxiliaresAlmacenesIds = (data.auxiliaresAlmacenes || []).map((u: any) => u.id);

        this.ssoHabilitado = data.ssoAuthentikHabilitado ?? true;
        this.authentikIssuerUrl = data.authentikIssuerUrl || 'https://auth.marabuntarl.com/application/o/intranet/';
        this.authentikLdapUrl = data.authentikLdapUrl || 'ldap://localhost:389';
        this.authentikClientId = data.authentikClientId || '';
      },
      error: (err) => console.error('Error al cargar configuración', err),
    });
  }

  guardarConfiguracion(): void {
    this.isSaving = true;

    const payload = {
      nombreEntidad: this.nombreEntidad,
      siglaEntidad: this.siglaEntidad,
      regimenNormativo: this.regimen,
      modalidadAdministracion: this.modalidad,
      exigirCite: this.exigirCite,
      responsableActivosId: this.responsableActivosId,
      responsableAlmacenesId: this.modalidad === 'UNIFICADA' ? this.responsableActivosId : this.responsableAlmacenesId,
      auxiliaresActivosIds: this.auxiliaresActivosIds,
      auxiliaresAlmacenesIds: this.auxiliaresAlmacenesIds,
      ssoAuthentikHabilitado: this.ssoHabilitado,
      authentikIssuerUrl: this.authentikIssuerUrl,
      authentikLdapUrl: this.authentikLdapUrl,
      authentikClientId: this.authentikClientId,
    };

    this.configService.updateConfiguracion(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('¡Configuración y asignación de responsables guardadas con éxito!', 'Cerrar', { duration: 4000 });
        this.cargarConfiguracion();
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Error al guardar la configuración', 'Cerrar', { duration: 3000 });
      },
    });
  }

  sincronizarClasificadores2027(): void {
    this.isSyncing2027 = true;
    this.configService.cargarClasificadores2027().subscribe({
      next: (res) => {
        this.isSyncing2027 = false;
        this.snackBar.open(res?.mensaje || 'Clasificador Presupuestario 2027 sincronizado correctamente', 'OK', {
          duration: 5000,
        });
      },
      error: (err) => {
        this.isSyncing2027 = false;
        this.snackBar.open(err?.error?.message || 'Error al cargar Clasificadores 2027', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
