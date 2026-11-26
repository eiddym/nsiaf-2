import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="login-page">
      <div class="login-wrapper">
        <aside class="brand-panel">
          <div class="brand-header">
            <div class="coat-emblem">
              <span class="material-icons emblem-icon">account_balance</span>
            </div>
            <div class="brand-text">
              <span class="country-tag">Sector Público & Cooperativas</span>
              <h2>NSIAF v2</h2>
            </div>
          </div>

          <div class="brand-body">
            <h3>Sistema Integrado de Activos Fijos y Almacenes</h3>
            <p>
              Gestión modular de inventarios, bienes muebles, maquinaria, kardex físico-valorado
              y autoservicio para funcionarios y personal operativo.
            </p>

            <ul class="features-list">
              <li>
                <span class="material-icons check-icon">verified</span>
                <span>Segregación estricta de roles: Activos vs Almacenes</span>
              </li>
              <li>
                <span class="material-icons check-icon">verified</span>
                <span>Portal autoservicio para solicitudes de funcionarios</span>
              </li>
              <li>
                <span class="material-icons check-icon">verified</span>
                <span>Integración SSO con Authentik institucional</span>
              </li>
              <li>
                <span class="material-icons check-icon">verified</span>
                <span>Trazabilidad forense, actas digitales y reportes normados</span>
              </li>
            </ul>
          </div>

          <footer class="brand-footer">
            <span class="version-badge">Versión 2.0.0 Enterprise</span>
            <span class="entity-name">SIAFA Modular Multi-Rol</span>
          </footer>
        </aside>

        <main class="form-panel">
          <header class="form-header">
            <h1>Ingreso al Sistema</h1>
            <p>Accede con tus credenciales asignadas o vía SSO Authentik</p>
          </header>

          @if (errorMessage) {
            <div class="alert-error" role="alert">
              <span class="material-icons error-icon">error_outline</span>
              <span>{{ errorMessage }}</span>
            </div>
          }

          <!-- Botón SSO Authentik Destacado -->
          <div class="sso-section">
            <button
              type="button"
              class="sso-authentik-btn"
              (click)="iniciarConAuthentik()"
              [disabled]="isLoading"
            >
              <span class="material-icons sso-icon">vpn_key</span>
              <span>Ingresar con SSO Authentik Institucional</span>
            </button>
            <div class="sso-divider">
              <span>o mediante usuario local</span>
            </div>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <div class="input-group">
              <label for="username">Usuario o C.I.</label>
              <div class="input-wrapper">
                <span class="material-icons field-icon">person</span>
                <input
                  id="username"
                  type="text"
                  formControlName="username"
                  placeholder="Ej: admin_activos o 4839201"
                  autocomplete="username"
                />
              </div>
              @if (loginForm.get('username')?.touched && loginForm.get('username')?.invalid) {
                <span class="field-error">Ingresa tu usuario o CI institucional</span>
              }
            </div>

            <div class="input-group">
              <label for="password">Contraseña</label>
              <div class="input-wrapper">
                <span class="material-icons field-icon">lock</span>
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="toggle-pwd-btn"
                  (click)="showPassword = !showPassword"
                  [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Ver contraseña en texto plano'"
                  tabindex="0"
                >
                  <span class="material-icons" aria-hidden="true">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
                <span class="field-error">La contraseña debe tener al menos 6 caracteres</span>
              }
            </div>

            <button
              type="submit"
              class="submit-btn"
              [disabled]="loginForm.invalid || isLoading"
            >
              @if (isLoading) {
                <span class="spinner"></span>
                <span>Validando acceso...</span>
              } @else {
                <span>Iniciar Sesión</span>
                <span class="material-icons">arrow_forward</span>
              }
            </button>
          </form>

          <section class="demo-accounts">
            <span class="demo-title">Accesos Rápidos por Rol:</span>
            <div class="demo-pills">
              <button
                type="button"
                class="pill-btn admin-activos"
                (click)="quickFill('admin_activos', 'activos123')"
                title="Solo módulo Activos Fijos"
              >
                <strong>admin_activos</strong> (Solo Activos)
              </button>
              <button
                type="button"
                class="pill-btn admin-almacenes"
                (click)="quickFill('admin_almacenes', 'activos123')"
                title="Solo módulo Almacenes"
              >
                <strong>admin_almacenes</strong> (Solo Almacén)
              </button>
              <button
                type="button"
                class="pill-btn super-admin"
                (click)="quickFill('admin', 'admin123')"
                title="Acceso total unificado"
              >
                <strong>admin</strong> (Super Admin)
              </button>
              <button
                type="button"
                class="pill-btn funcionario"
                (click)="quickFill('jflores', 'funcionario123')"
                title="Portal del Funcionario / Solicitudes"
              >
                <strong>jflores</strong> (Funcionario)
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #091322 0%, #0f172a 50%, #1e293b 100%);
      padding: 1.5rem;
    }

    .login-wrapper {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      width: 100%;
      max-width: 1000px;
      min-height: 600px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
    }

    /* Left Brand Panel */
    .brand-panel {
      background: linear-gradient(150deg, #0b2246 0%, #0d3269 60%, #164e96 100%);
      color: #ffffff;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .brand-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .coat-emblem {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .emblem-icon {
      font-size: 28px;
      color: #38bdf8;
    }

    .country-tag {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #93c5fd;
      font-weight: 600;
    }

    .brand-text h2 {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .brand-body {
      margin: 2rem 0;
    }

    .brand-body h3 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.35;
      margin-bottom: 0.75rem;
      color: #e2e8f0;
    }

    .brand-body p {
      font-size: 0.88rem;
      line-height: 1.55;
      color: #cbd5e1;
      margin-bottom: 1.5rem;
    }

    .features-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .features-list li {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.86rem;
      color: #f8fafc;
    }

    .check-icon {
      color: #38bdf8;
      font-size: 1.15rem;
    }

    .brand-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 1.25rem;
    }

    .version-badge {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-weight: 500;
    }

    /* Right Form Panel */
    .form-panel {
      padding: 2.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .form-header h1 {
      font-size: 1.65rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .form-header p {
      font-size: 0.86rem;
      color: #64748b;
      margin-top: 0.25rem;
      margin-bottom: 1.25rem;
    }

    .sso-section {
      margin-bottom: 1rem;
    }

    .sso-authentik-btn {
      width: 100%;
      height: 44px;
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #0369a1;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .sso-authentik-btn:hover {
      background: #0369a1;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }

    .sso-icon {
      font-size: 1.25rem;
    }

    .sso-divider {
      text-align: center;
      margin: 1rem 0 0.5rem 0;
      position: relative;
    }

    .sso-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e2e8f0;
      z-index: 1;
    }

    .sso-divider span {
      position: relative;
      background: #ffffff;
      padding: 0 0.75rem;
      font-size: 0.75rem;
      color: #94a3b8;
      z-index: 2;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #b91c1c;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .error-icon {
      font-size: 1.25rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .input-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-wrapper .field-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 1.25rem;
      pointer-events: none;
    }

    .input-wrapper input {
      width: 100%;
      height: 42px;
      padding: 0 2.5rem 0 2.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.92rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s ease;
    }

    .input-wrapper input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .toggle-pwd-btn {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.35rem;
      display: flex;
      align-items: center;
    }

    .field-error {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 500;
    }

    .submit-btn {
      height: 44px;
      background: #0d3269;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.35rem;
    }

    .submit-btn:hover:not(:disabled) {
      background: #164e96;
    }

    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Demo Quick Picks */
    .demo-accounts {
      margin-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }

    .demo-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      display: block;
      margin-bottom: 0.5rem;
    }

    .demo-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .pill-btn {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      font-size: 0.74rem;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-btn:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }

    @media (max-width: 768px) {
      .login-wrapper {
        grid-template-columns: 1fr;
      }
      .brand-panel {
        display: none;
      }
      .form-panel {
        padding: 1.5rem 1rem;
      }
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  quickFill(user: string, pass: string): void {
    this.loginForm.patchValue({
      username: user,
      password: pass,
    });
    this.errorMessage = '';
  }

  iniciarConAuthentik(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Auto-login or exchange with Authentik identity
    this.authService
      .loginAuthentik({
        username: 'funcionario_sso',
        nombres: 'Funcionario',
        apellidos: 'Authentik',
        email: 'funcionario@marabuntarl.com',
        cargo: 'Funcionario Institucional',
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'No se pudo completar la autenticación con Authentik.';
        },
      });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos. Verifica tus credenciales.';
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor. Intenta nuevamente.';
        }
      },
    });
  }
}
