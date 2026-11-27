import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActivosService } from '../../core/services/activos.service';
import jsQR from 'jsqr';

@Component({
  selector: 'app-verificacion-qr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="verif-wrapper" role="main" aria-label="Verificación Oficial y Toma de Inventario de Activo Fijo">
      <div class="verif-card">
        <!-- Header Institucional con Acceso Rápido a Escáner -->
        <header class="verif-header">
          <div class="header-main-info">
            <div class="header-emblem" aria-hidden="true">
              <span class="material-icons emblem-icon">verified_user</span>
            </div>
            <div class="header-titles">
              <span class="institution-name">ESTADO PLURINACIONAL DE BOLIVIA</span>
              <h1>Verificación Rápida y Registro de Vigencia</h1>
              <span class="system-tag">NSIAF v2 · Sistema de Identificación Global QR</span>
            </div>
          </div>

          <div class="header-mobile-actions">
            <button
              type="button"
              class="mobile-camera-btn"
              (click)="abrirEscanerCamara()"
              aria-label="Abrir escáner de cámara móvil"
            >
              <span class="material-icons" aria-hidden="true">photo_camera</span>
              <span>Escanear QR</span>
            </button>
          </div>
        </header>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="state-container" role="status" aria-live="polite">
            <div class="spinner" aria-hidden="true"></div>
            <p>Consultando base de datos central de activos fijos...</p>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="state-container error" role="alert">
            <span class="material-icons error-icon" aria-hidden="true">error_outline</span>
            <h2>Activo No Encontrado o Inválido</h2>
            <p>{{ error() }}</p>
            <div class="error-actions">
              <button type="button" class="action-cam-btn" (click)="abrirEscanerCamara()">
                <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
                <span>Escanear Otro Código QR</span>
              </button>
              <a routerLink="/activos" class="back-link">Volver al Inventario</a>
            </div>
          </div>
        }

        <!-- Data Verified -->
        @if (data(); as d) {
          <article class="verif-body">
            <!-- Banner de Éxito de Registro Reciente -->
            @if (mensajeExitoRegistro()) {
              <aside class="success-banner" role="status" aria-live="polite">
                <span class="material-icons success-icon" aria-hidden="true">check_circle</span>
                <div class="success-content">
                  <strong>{{ mensajeExitoRegistro() }}</strong>
                  <p>Estado físico y condición de vigencia actualizados en el sistema central.</p>
                </div>
              </aside>
            }

            <!-- Sello de Estado Oficial -->
            <div class="seal-banner" [ngClass]="d.estadoLegal.toLowerCase()">
              <span class="material-icons seal-icon" aria-hidden="true">
                {{ d.estadoLegal === 'ASIGNADO' ? 'check_circle' : (d.estadoLegal === 'DADO_DE_BAJA' ? 'do_not_disturb_on' : 'inventory_2') }}
              </span>
              <div class="seal-text">
                <strong>{{ d.estadoLegal === 'ASIGNADO' ? 'ACTIVO ASIGNADO EN CUSTODIA VÁLIDA' : (d.estadoLegal === 'DADO_DE_BAJA' ? 'ACTIVO DADO DE BAJA' : 'EN DEPÓSITO CENTRAL') }}</strong>
                <p>Verificación legal conforme a las Normas Básicas del SABS (D.S. 0181)</p>
              </div>
            </div>

            <!-- Grid: QR Visual + Metadatos Clave -->
            <div class="qr-showcase">
              <div class="qr-box">
                <img [src]="d.qrDataUrl" alt="Código QR de Identificación Global del Activo Fijo" class="qr-image" />
                <span class="qr-code-label">{{ d.activo.codigoBarras }}</span>
              </div>
              <div class="qr-meta">
                <h2>{{ d.activo.descripcion }}</h2>
                <p class="asset-meta-detail">{{ d.activo.detalle || 'Sin observaciones previas registradas.' }}</p>

                <div class="specs-grid">
                  <div class="spec-cell">
                    <span class="spec-label">Marca / Modelo</span>
                    <strong class="spec-value">{{ d.activo.marca || 'S/M' }} · {{ d.activo.modelo || 'S/M' }}</strong>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Número de Serie</span>
                    <strong class="spec-value mono">{{ d.activo.serie || 'S/N' }}</strong>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Rubro Contable</span>
                    <strong class="spec-value">{{ d.activo.cuentaContable }}</strong>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Estado Físico Actual</span>
                    <strong class="spec-value status-badge" [ngClass]="d.activo.estado.toLowerCase()">{{ d.activo.estado }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Asociación a Empleado / Custodio -->
            <section class="employee-card" aria-label="Información del Funcionario Responsable">
              <div class="employee-header">
                <span class="material-icons card-icon" aria-hidden="true">badge</span>
                <h3>Empleado / Funcionario Asignado</h3>
              </div>
              <div class="employee-body">
                @if (d.asociacionEmpleado.asignado) {
                  <div class="employee-row">
                    <div class="emp-field">
                      <span class="emp-label">Nombre del Custodio</span>
                      <strong class="emp-name">{{ d.asociacionEmpleado.custodioNombre }}</strong>
                    </div>
                    <div class="emp-field">
                      <span class="emp-label">Cédula de Identidad</span>
                      <strong class="emp-value mono">{{ d.asociacionEmpleado.ci }}</strong>
                    </div>
                  </div>
                  <div class="employee-row">
                    <div class="emp-field">
                      <span class="emp-label">Cargo Institucional</span>
                      <strong class="emp-value">{{ d.asociacionEmpleado.cargo }}</strong>
                    </div>
                    <div class="emp-field">
                      <span class="emp-label">Unidad de Dependencia</span>
                      <strong class="emp-value">{{ d.asociacionEmpleado.unidad }}</strong>
                    </div>
                  </div>
                  <div class="employee-row">
                    <div class="emp-field full">
                      <span class="emp-label">Ubicación Física Asignada</span>
                      <strong class="emp-value">{{ d.activo.ubicacion || 'Oficina Central' }}</strong>
                    </div>
                  </div>
                } @else {
                  <p class="unassigned-notice">
                    <span class="material-icons notice-icon" aria-hidden="true">info</span>
                    Actualmente este bien se encuentra en almacén/depósito central sin custodio particular asignado.
                  </p>
                }
              </div>
            </section>

            <!-- FORMULARIO MÓVIL: Registro de Inspección Física y Vigencia por Personal de Activos -->
            <section class="inspection-card" aria-label="Registro de Inspección Física y Vigencia">
              <div class="inspection-header">
                <div class="insp-title-wrap">
                  <span class="material-icons insp-icon" aria-hidden="true">fact_check</span>
                  <div>
                    <h3>Toma de Inventario Físico y Registro de Vigencia</h3>
                    <p>Módulo de campo para personal de activos y fiscalización técnica</p>
                  </div>
                </div>
                <span class="badge-role">Personal de Activos</span>
              </div>

              <div class="inspection-body">
                <!-- Selector: Estado Físico -->
                <div class="form-group-custom">
                  <label class="group-label">1. Estado Físico del Bien:</label>
                  <div class="state-pills-grid" role="radiogroup" aria-label="Selección de estado físico">
                    <button
                      type="button"
                      class="state-pill bueno"
                      [class.active]="estadoSeleccionado === 'BUENO'"
                      (click)="estadoSeleccionado = 'BUENO'"
                      aria-label="Marcar como Estado Físico Bueno"
                    >
                      <span class="material-icons" aria-hidden="true">check_circle</span>
                      <span>Bueno (Operativo)</span>
                    </button>
                    <button
                      type="button"
                      class="state-pill regular"
                      [class.active]="estadoSeleccionado === 'REGULAR'"
                      (click)="estadoSeleccionado = 'REGULAR'"
                      aria-label="Marcar como Estado Físico Regular"
                    >
                      <span class="material-icons" aria-hidden="true">warning</span>
                      <span>Regular (Desgaste)</span>
                    </button>
                    <button
                      type="button"
                      class="state-pill malo"
                      [class.active]="estadoSeleccionado === 'MALO'"
                      (click)="estadoSeleccionado = 'MALO'"
                      aria-label="Marcar como Estado Físico Malo"
                    >
                      <span class="material-icons" aria-hidden="true">cancel</span>
                      <span>Malo (Deteriorado)</span>
                    </button>
                  </div>
                </div>

                <!-- Selector: Condición de Vigencia Operativa -->
                <div class="form-group-custom">
                  <label class="group-label">2. Condición de Vigencia Operativa (D.S. 0181):</label>
                  <div class="vigencia-cards-grid" role="radiogroup" aria-label="Selección de vigencia">
                    <button
                      type="button"
                      class="vigencia-card vigente"
                      [class.active]="vigenciaSeleccionada === 'VIGENTE'"
                      (click)="vigenciaSeleccionada = 'VIGENTE'"
                      aria-label="Marcar como Vigente en Operación"
                    >
                      <span class="material-icons" aria-hidden="true">verified</span>
                      <div class="vig-text">
                        <strong>Vigente en Servicio</strong>
                        <small>Bien en pleno uso institucional</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="vigencia-card baja"
                      [class.active]="vigenciaSeleccionada === 'PROPUESTO_BAJA'"
                      (click)="vigenciaSeleccionada = 'PROPUESTO_BAJA'"
                      aria-label="Marcar como Propuesto para Baja"
                    >
                      <span class="material-icons" aria-hidden="true">delete_sweep</span>
                      <div class="vig-text">
                        <strong>Para Baja</strong>
                        <small>Inoperable / Daño irreparable</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="vigencia-card revision"
                      [class.active]="vigenciaSeleccionada === 'EN_REVISION'"
                      (click)="vigenciaSeleccionada = 'EN_REVISION'"
                      aria-label="Marcar como En Revisión Técnica"
                    >
                      <span class="material-icons" aria-hidden="true">build_circle</span>
                      <div class="vig-text">
                        <strong>En Revisión</strong>
                        <small>Mantenimiento o peritaje</small>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Ubicación Física Verificada -->
                <div class="form-group-custom">
                  <label for="ubicacionFisicaInput" class="group-label">3. Ubicación Física Verificada en Terreno:</label>
                  <input
                    id="ubicacionFisicaInput"
                    type="text"
                    [(ngModel)]="ubicacionFisica"
                    class="mobile-text-input"
                    placeholder="Ej: Piso 2 - Oficina 204 (Dirección Ejecutiva)"
                  />
                </div>

                <!-- Observaciones de Campo -->
                <div class="form-group-custom">
                  <label for="observacionesCampo" class="group-label">4. Observaciones Técnicas y de Custodia:</label>
                  <div class="preset-chips-wrap">
                    <button type="button" class="preset-chip" (click)="agregarObservacionRapida('Equipo verificado en funciones óptimas y completo.')">
                      + Operativo y completo
                    </button>
                    <button type="button" class="preset-chip" (click)="agregarObservacionRapida('Presenta desgaste normal por uso, accesorios completos.')">
                      + Desgaste normal
                    </button>
                    <button type="button" class="preset-chip" (click)="agregarObservacionRapida('Equipo dañado sin reparación económica viable, se propone para baja.')">
                      + Proponer baja técnica
                    </button>
                    <button type="button" class="preset-chip" (click)="agregarObservacionRapida('Verificado en poder y custodia del funcionario responsable.')">
                      + Custodia ratificada
                    </button>
                  </div>
                  <textarea
                    id="observacionesCampo"
                    [(ngModel)]="observacionesInspeccion"
                    rows="3"
                    class="mobile-textarea"
                    placeholder="Escriba el detalle técnico de la inspección física..."
                  ></textarea>
                </div>

                <!-- Botón Principal de Envío -->
                <div class="submit-action-box">
                  <button
                    type="button"
                    class="btn-save-inspection"
                    [disabled]="guardandoInspeccion()"
                    (click)="guardarInspeccionFisica(d.activo.codigoBarras)"
                    aria-label="Guardar registro de inspección física y vigencia"
                  >
                    <span class="material-icons" aria-hidden="true">
                      {{ guardandoInspeccion() ? 'sync' : 'save_alt' }}
                    </span>
                    <span>{{ guardandoInspeccion() ? 'Guardando Registro...' : 'Registrar Inspección y Vigencia' }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Acciones Finales -->
            <footer class="verif-footer">
              <button type="button" class="action-btn-camera" (click)="abrirEscanerCamara()" aria-label="Escanear otro código QR con la cámara">
                <span class="material-icons" aria-hidden="true">qr_code_scanner</span>
                <span>Escanear Siguiente</span>
              </button>
              <button type="button" class="print-btn" (click)="imprimirRotulo()" aria-label="Imprimir Rótulo QR Institucional">
                <span class="material-icons" aria-hidden="true">print</span>
                <span>Imprimir Rótulo</span>
              </button>
              <a routerLink="/activos" class="nav-btn">
                <span class="material-icons" aria-hidden="true">arrow_back</span>
                <span>Volver al Sistema</span>
              </a>
            </footer>
          </article>
        }
      </div>

      <!-- MODAL / OVERLAY: ESCÁNER DE CÁMARA MÓVIL EN TIEMPO REAL -->
      @if (mostrarEscaner()) {
        <div class="camera-modal-backdrop" (click)="cerrarEscanerCamara()">
          <div
            class="camera-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-modal-title"
            (click)="$event.stopPropagation()"
          >
            <header class="camera-modal-header">
              <div class="cam-title-info">
                <span class="material-icons cam-header-icon" aria-hidden="true">photo_camera</span>
                <h2 id="camera-modal-title">Escáner Móvil QR</h2>
              </div>
              <button
                type="button"
                class="cam-close-btn"
                (click)="cerrarEscanerCamara()"
                aria-label="Cerrar escáner de cámara"
              >
                <span class="material-icons" aria-hidden="true">close</span>
              </button>
            </header>

            <!-- Input invisible para captura nativa de cámara móvil -->
            <input
              #cameraFileInput
              type="file"
              accept="image/*"
              capture="environment"
              (change)="onFotoCapturada($event)"
              style="display: none;"
            />

            <div class="camera-viewport-wrap">
              @if (errorCamara()) {
                <div class="camera-fallback-card" role="alert">
                  <span class="material-icons fallback-icon" aria-hidden="true">videocam_off</span>
                  <h3>Cámara en Vivo No Disponible</h3>
                  <p class="error-detail-msg">{{ errorCamara() }}</p>

                  <div class="camera-native-cta">
                    <button
                      type="button"
                      class="btn-native-cam"
                      (click)="cameraFileInput.click()"
                      aria-label="Tomar foto directa del código QR con la cámara del dispositivo"
                    >
                      <span class="material-icons" aria-hidden="true">photo_camera</span>
                      <span>Tomar Foto del QR con Cámara Móvil</span>
                    </button>
                    <button
                      type="button"
                      class="btn-retry-stream"
                      (click)="iniciarStreamCamara()"
                      aria-label="Reintentar video en vivo"
                    >
                      <span class="material-icons" aria-hidden="true">refresh</span>
                      <span>Reintentar Video en Vivo</span>
                    </button>
                  </div>

                  <p class="fallback-note">O ingrese el código del activo o utilice un lector láser manual:</p>
                  <div class="manual-scan-box">
                    <input
                      type="text"
                      [(ngModel)]="manualCodeInput"
                      (keyup.enter)="procesarCodigoManual()"
                      placeholder="Ej: ENT-12400-0001"
                      class="mobile-text-input"
                    />
                    <button type="button" class="btn-manual-submit" (click)="procesarCodigoManual()">
                      Verificar
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Live Video Feed -->
                <div class="video-container">
                  <video #scannerVideo playsinline autoplay muted class="scanner-video-feed"></video>
                  <canvas #scannerCanvas class="scanner-canvas-hidden"></canvas>

                  <!-- Viewfinder HUD / Retículo de escaneo -->
                  <div class="scanner-viewfinder" aria-hidden="true">
                    <div class="corner-bracket top-left"></div>
                    <div class="corner-bracket top-right"></div>
                    <div class="corner-bracket bottom-left"></div>
                    <div class="corner-bracket bottom-right"></div>
                    <div class="laser-scanner-line"></div>
                  </div>

                  <div class="scanner-hud-hint">
                    <span class="material-icons" aria-hidden="true">center_focus_strong</span>
                    <span>Enfoque el código QR del activo dentro del marco</span>
                  </div>
                </div>

                <div class="camera-controls-bar">
                  <button
                    type="button"
                    class="cam-tool-btn snap-action-btn"
                    (click)="cameraFileInput.click()"
                    aria-label="Tomar foto con la cámara del teléfono o subir imagen"
                  >
                    <span class="material-icons" aria-hidden="true">photo_camera</span>
                    <span>Tomar Foto</span>
                  </button>

                  <button
                    type="button"
                    class="cam-tool-btn"
                    (click)="alternarLinterna()"
                    [disabled]="!soportaLinterna"
                    aria-label="Alternar linterna flash"
                  >
                    <span class="material-icons" aria-hidden="true">{{ linternaActiva ? 'flash_on' : 'flash_off' }}</span>
                    <span>{{ linternaActiva ? 'Luz ON' : 'Linterna' }}</span>
                  </button>

                  <button
                    type="button"
                    class="cam-tool-btn"
                    (click)="alternarCamara()"
                    aria-label="Cambiar entre cámara trasera y delantera"
                  >
                    <span class="material-icons" aria-hidden="true">flip_camera_android</span>
                    <span>Girar</span>
                  </button>
                </div>
              }
            </div>

            <!-- Entrada Manual de Apoyo -->
            <div class="camera-modal-footer">
              <span class="manual-label">¿No enfoca o prefiere escribir?</span>
              <div class="manual-input-row">
                <input
                  type="text"
                  [(ngModel)]="manualCodeInput"
                  (keyup.enter)="procesarCodigoManual()"
                  placeholder="ENT-12400-0001..."
                  class="mobile-text-input mini"
                />
                <button type="button" class="btn-manual-apply" (click)="procesarCodigoManual()">
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    .verif-wrapper {
      min-height: 100vh;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      box-sizing: border-box;
      min-width: 0;
      background: linear-gradient(135deg, #0b192c 0%, #1e293b 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem 1.5rem;
      font-family: inherit;
    }

    .verif-card {
      width: 100%;
      max-width: 820px;
      box-sizing: border-box;
      min-width: 0;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      border: 1px solid #cbd5e1;
    }

    .verif-header {
      background: #0d3269;
      color: #ffffff;
      padding: 1.5rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      border-bottom: 3px solid #164e96;
    }

    .header-main-info {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .header-emblem {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .emblem-icon {
      font-size: 2rem;
      color: #38bdf8;
    }

    .institution-name {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #93c5fd;
      font-weight: 700;
      display: block;
    }

    .verif-header h1 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0.2rem 0;
      line-height: 1.2;
    }

    .system-tag {
      font-size: 0.8rem;
      color: #cbd5e1;
    }

    .mobile-camera-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.15rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);
      transition: all 0.2s;
      white-space: nowrap;
    }

    .mobile-camera-btn:hover {
      background: #0369a1;
      transform: translateY(-1px);
    }

    .verif-body {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    /* Success Banner */
    .success-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #ecfdf5;
      border: 1px solid #10b981;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      animation: fadeIn 0.3s ease-out;
    }

    .success-icon {
      color: #059669;
      font-size: 2rem;
    }

    .success-content strong {
      display: block;
      color: #065f46;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .success-content p {
      font-size: 0.82rem;
      color: #047857;
      margin-top: 0.15rem;
    }

    /* Seal Banner */
    .seal-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 10px;
    }

    .seal-banner.asignado {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #14532d;
    }
    .seal-banner.asignado .seal-icon { color: #16a34a; }

    .seal-banner.disponible {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e3a8a;
    }
    .seal-banner.disponible .seal-icon { color: #2563eb; }

    .seal-banner.dado_de_baja {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #7f1d1d;
    }
    .seal-banner.dado_de_baja .seal-icon { color: #dc2626; }

    .seal-icon { font-size: 2rem; }
    .seal-text strong { font-size: 0.95rem; font-weight: 800; display: block; }
    .seal-text p { font-size: 0.78rem; margin-top: 0.15rem; color: #475569; }

    /* QR Showcase */
    .qr-showcase {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 1.5rem;
      align-items: center;
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .qr-box {
      background: #ffffff;
      padding: 0.75rem;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    .qr-image {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }

    .qr-code-label {
      display: block;
      font-family: monospace;
      font-size: 0.82rem;
      font-weight: 800;
      color: #0d3269;
      margin-top: 0.5rem;
    }

    .qr-meta h2 {
      font-size: 1.18rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }

    .asset-meta-detail {
      font-size: 0.85rem;
      color: #475569;
      margin-top: 0.35rem;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
      margin-top: 1rem;
    }

    .spec-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .spec-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .spec-value {
      font-size: 0.88rem;
      color: #1e293b;
    }

    .spec-value.mono { font-family: monospace; }

    .status-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 800;
      width: fit-content;
    }
    .status-badge.bueno { background: #dcfce7; color: #166534; }
    .status-badge.regular { background: #fef3c7; color: #92400e; }
    .status-badge.malo { background: #fee2e2; color: #991b1b; }

    /* Employee Card */
    .employee-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
    }

    .employee-header {
      background: #f1f5f9;
      padding: 0.8rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .card-icon {
      color: #0d3269;
      font-size: 1.25rem;
    }

    .employee-header h3 {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .employee-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .employee-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .emp-field {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .emp-field.full {
      grid-column: 1 / -1;
    }

    .emp-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .emp-name {
      font-size: 1rem;
      font-weight: 800;
      color: #0d3269;
    }

    .emp-value {
      font-size: 0.88rem;
      color: #1e293b;
    }

    .emp-value.mono { font-family: monospace; }

    .unassigned-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.88rem;
      font-style: italic;
    }

    .notice-icon { color: #0284c7; }

    /* FORMULARIO DE INSPECCIÓN FÍSICA */
    .inspection-card {
      background: #ffffff;
      border: 2px solid #0d3269;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(13, 50, 105, 0.08);
    }

    .inspection-header {
      background: #0d3269;
      color: #ffffff;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .insp-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .insp-icon {
      font-size: 1.8rem;
      color: #38bdf8;
    }

    .insp-title-wrap h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .insp-title-wrap p {
      font-size: 0.75rem;
      color: #cbd5e1;
      margin: 0.15rem 0 0 0;
    }

    .badge-role {
      background: #164e96;
      color: #ffffff;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .inspection-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group-custom {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .group-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    /* State Pills */
    .state-pills-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .state-pill {
      border: 2px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      padding: 0.75rem 0.5rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .state-pill:hover {
      background: #f1f5f9;
    }

    .state-pill.bueno.active {
      background: #ecfdf5;
      border-color: #10b981;
      color: #065f46;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .state-pill.regular.active {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #92400e;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    .state-pill.malo.active {
      background: #fef2f2;
      border-color: #ef4444;
      color: #991b1b;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    /* Vigencia Cards */
    .vigencia-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .vigencia-card {
      border: 2px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      padding: 0.85rem 0.75rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .vigencia-card:hover {
      background: #f1f5f9;
    }

    .vig-text strong {
      display: block;
      font-size: 0.88rem;
      font-weight: 800;
    }

    .vig-text small {
      display: block;
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 0.1rem;
    }

    .vigencia-card.vigente.active {
      background: #eff6ff;
      border-color: #2563eb;
      color: #1e40af;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }
    .vigencia-card.vigente.active .material-icons { color: #2563eb; }

    .vigencia-card.baja.active {
      background: #fef2f2;
      border-color: #dc2626;
      color: #991b1b;
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
    }
    .vigencia-card.baja.active .material-icons { color: #dc2626; }

    .vigencia-card.revision.active {
      background: #fffbeb;
      border-color: #d97706;
      color: #b45309;
      box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
    }
    .vigencia-card.revision.active .material-icons { color: #d97706; }

    .preset-chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.35rem;
    }

    .preset-chip {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.25rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .preset-chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .mobile-text-input {
      width: 100%;
      height: 44px;
      padding: 0 0.85rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
    }

    .mobile-text-input:focus, .mobile-textarea:focus {
      border-color: #0d3269;
      box-shadow: 0 0 0 3px rgba(13, 50, 105, 0.15);
    }

    .mobile-textarea {
      width: 100%;
      padding: 0.75rem 0.85rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      font-family: inherit;
      resize: vertical;
    }

    .submit-action-box {
      margin-top: 0.5rem;
    }

    .btn-save-inspection {
      width: 100%;
      height: 48px;
      background: #047857;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25);
      transition: all 0.2s;
    }

    .btn-save-inspection:hover {
      background: #065f46;
      box-shadow: 0 6px 16px rgba(4, 120, 87, 0.35);
    }

    .btn-save-inspection:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Footer */
    .verif-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .action-btn-camera {
      background: #0369a1;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .action-btn-camera:hover { background: #075985; }

    .print-btn {
      background: #0d3269;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #164e96; }

    .nav-btn {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .nav-btn:hover { background: #e2e8f0; }

    /* State feedback */
    .state-container {
      padding: 3rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #0d3269;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .error-icon {
      font-size: 3rem;
      color: #ef4444;
    }

    .error-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .action-cam-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1.5rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      cursor: pointer;
    }

    .back-link {
      color: #0d3269;
      font-weight: 700;
      text-decoration: underline;
    }

    /* CAMERA SCANNER MODAL */
    .camera-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(11, 25, 44, 0.85);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .camera-modal-panel {
      width: 100%;
      max-width: 500px;
      box-sizing: border-box;
      background: #0f172a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      border: 1px solid #334155;
      display: flex;
      flex-direction: column;
    }

    .camera-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      color: #ffffff;
    }

    .cam-title-info {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .cam-header-icon {
      color: #38bdf8;
      font-size: 1.5rem;
    }

    .cam-title-info h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #ffffff;
    }

    .cam-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0.35rem;
      border-radius: 6px;
    }

    .cam-close-btn:hover {
      background: #334155;
      color: #ffffff;
    }

    .camera-viewport-wrap {
      position: relative;
      background: #000000;
      min-height: 340px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .video-container {
      position: relative;
      width: 100%;
      height: 340px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-video-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scanner-canvas-hidden {
      display: none;
    }

    /* Retículo HUD con animación de láser */
    .scanner-viewfinder {
      position: absolute;
      width: 220px;
      height: 220px;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      border-radius: 12px;
    }

    .corner-bracket {
      position: absolute;
      width: 28px;
      height: 28px;
      border-color: #38bdf8;
      border-style: solid;
    }

    .corner-bracket.top-left { top: 0; left: 0; border-width: 4px 0 0 4px; border-top-left-radius: 8px; }
    .corner-bracket.top-right { top: 0; right: 0; border-width: 4px 4px 0 0; border-top-right-radius: 8px; }
    .corner-bracket.bottom-left { bottom: 0; left: 0; border-width: 0 0 4px 4px; border-bottom-left-radius: 8px; }
    .corner-bracket.bottom-right { bottom: 0; right: 0; border-width: 0 4px 4px 0; border-bottom-right-radius: 8px; }

    .laser-scanner-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #ef4444 50%, transparent);
      box-shadow: 0 0 10px #ef4444;
      animation: scanLaser 2s infinite ease-in-out;
    }

    @keyframes scanLaser {
      0% { top: 5%; opacity: 0.9; }
      50% { top: 95%; opacity: 0.9; }
      100% { top: 5%; opacity: 0.9; }
    }

    .scanner-hud-hint {
      position: absolute;
      bottom: 12px;
      background: rgba(15, 23, 42, 0.8);
      color: #f1f5f9;
      padding: 0.4rem 0.85rem;
      border-radius: 20px;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      backdrop-filter: blur(4px);
    }

    .camera-controls-bar {
      width: 100%;
      background: #0f172a;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      padding: 0.75rem;
      border-top: 1px solid #1e293b;
    }

    .cam-tool-btn {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
    }

    .cam-tool-btn:hover {
      background: #334155;
    }

    .cam-tool-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .camera-fallback-card {
      padding: 2rem 1.5rem;
      text-align: center;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .camera-fallback-card .material-icons {
      font-size: 3rem;
      color: #f59e0b;
    }

    .camera-fallback-card h3 {
      font-size: 1.1rem;
      margin: 0;
    }

    .camera-fallback-card p {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0;
    }

    .fallback-note {
      margin-top: 0.5rem !important;
      color: #cbd5e1 !important;
    }

    .camera-native-cta {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: 100%;
      margin: 0.75rem 0;
    }

    .btn-native-cam {
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.4);
      transition: background 0.15s ease;
    }

    .btn-native-cam:hover {
      background: #0369a1;
    }

    .btn-retry-stream {
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-weight: 600;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      cursor: pointer;
    }

    .cam-tool-btn.snap-action-btn {
      background: #0284c7;
      color: #ffffff;
    }

    .manual-scan-box {
      display: flex;
      gap: 0.5rem;
      width: 100%;
      margin-top: 0.75rem;
    }

    .btn-manual-submit {
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0 1.25rem;
      font-weight: 700;
      cursor: pointer;
    }

    .camera-modal-footer {
      background: #1e293b;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .manual-label {
      font-size: 0.78rem;
      color: #94a3b8;
      white-space: nowrap;
    }

    .manual-input-row {
      display: flex;
      gap: 0.4rem;
      flex: 1;
      max-width: 260px;
    }

    .mobile-text-input.mini {
      height: 36px;
      font-size: 0.82rem;
      background: #0f172a;
      border-color: #475569;
      color: #f8fafc;
    }

    .btn-manual-apply {
      background: #334155;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* RESPONSIVE DESIGN - MOBILE FIRST (< 768px) */
    @media (max-width: 768px) {
      .verif-wrapper {
        padding: 0.75rem 0.5rem;
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
        background: #0b192c;
      }

      .verif-card {
        border-radius: 12px;
      }

      .verif-header {
        flex-direction: column;
        align-items: flex-start;
        padding: 1.25rem 1rem;
        gap: 1rem;
      }

      .header-mobile-actions {
        width: 100%;
      }

      .mobile-camera-btn {
        width: 100%;
        justify-content: center;
        height: 46px;
        font-size: 0.95rem;
      }

      .verif-body {
        padding: 1rem;
        gap: 1.25rem;
      }

      .qr-showcase {
        grid-template-columns: 1fr;
        padding: 1rem;
        text-align: center;
      }

      .qr-box {
        max-width: 180px;
        margin: 0 auto;
      }

      .specs-grid {
        grid-template-columns: 1fr;
        text-align: left;
        gap: 0.5rem;
      }

      .state-pills-grid {
        grid-template-columns: 1fr;
      }

      .vigencia-cards-grid {
        grid-template-columns: 1fr;
      }

      .employee-row {
        grid-template-columns: 1fr;
        gap: 0.6rem;
      }

      .inspection-body {
        padding: 1rem;
      }

      .verif-footer {
        flex-direction: column;
        width: 100%;
      }

      .action-btn-camera, .print-btn, .nav-btn {
        width: 100%;
        justify-content: center;
        height: 46px;
      }
    }

    @media print {
      .verif-wrapper {
        background: none;
        padding: 0;
      }
      .verif-card {
        box-shadow: none;
        border: none;
      }
      .verif-footer, .nav-btn, .mobile-camera-btn, .inspection-card {
        display: none !important;
      }
    }
  `],
})
export class VerificacionQrComponent implements OnInit, OnDestroy {
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  data = signal<any | null>(null);

  // Estados del Formulario de Inspección Física
  estadoSeleccionado: 'BUENO' | 'REGULAR' | 'MALO' = 'BUENO';
  vigenciaSeleccionada: 'VIGENTE' | 'PROPUESTO_BAJA' | 'EN_REVISION' = 'VIGENTE';
  ubicacionFisica = '';
  observacionesInspeccion = '';
  verificadorNombre = 'Técnico de Activos Fijos';
  guardandoInspeccion = signal<boolean>(false);
  mensajeExitoRegistro = signal<string | null>(null);

  // Estados de Cámara Móvil
  mostrarEscaner = signal<boolean>(false);
  errorCamara = signal<string | null>(null);
  manualCodeInput = '';
  linternaActiva = false;
  soportaLinterna = false;
  facingMode: 'environment' | 'user' = 'environment';

  @ViewChild('scannerVideo') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('scannerCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cameraFileInput') cameraFileInputRef?: ElementRef<HTMLInputElement>;

  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private scanningActive = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activosService: ActivosService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const code = params.get('code');
      if (code && code !== 'scan') {
        this.cargarDatosActivo(code);
      } else {
        // Modo escáner directo: activar cámara móvil automáticamente
        this.isLoading.set(false);
        this.abrirEscanerCamara();
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerCamaraStream();
  }

  cargarDatosActivo(code: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.mensajeExitoRegistro.set(null);

    this.activosService.verificarActivo(code).subscribe({
      next: (res) => {
        this.data.set(res);
        this.estadoSeleccionado = res.activo.estado || 'BUENO';
        this.ubicacionFisica = res.activo.ubicacion || 'Edificio Central';
        this.observacionesInspeccion = '';
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.error?.message || 'No fue posible validar el código QR escaneado en el sistema.'
        );
        this.isLoading.set(false);
      },
    });
  }

  agregarObservacionRapida(texto: string): void {
    if (this.observacionesInspeccion) {
      this.observacionesInspeccion += ` ${texto}`;
    } else {
      this.observacionesInspeccion = texto;
    }
  }

  guardarInspeccionFisica(codigoBarras: string): void {
    this.guardandoInspeccion.set(true);
    this.mensajeExitoRegistro.set(null);

    this.activosService.registrarVerificacionFisica({
      identificador: codigoBarras,
      estado: this.estadoSeleccionado,
      estadoVigencia: this.vigenciaSeleccionada,
      observaciones: this.observacionesInspeccion || 'Inspección de campo verificada',
      ubicacionFisica: this.ubicacionFisica,
      verificador: this.verificadorNombre,
    }).subscribe({
      next: (resp) => {
        this.guardandoInspeccion.set(false);
        this.mensajeExitoRegistro.set(resp.mensaje);

        // Actualizar datos en pantalla en tiempo real
        this.data.update((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activo: {
              ...prev.activo,
              estado: this.estadoSeleccionado,
              detalle: resp.activoActualizado?.detalle || prev.activo.detalle,
              ubicacion: this.ubicacionFisica,
            },
          };
        });

        // Haptic feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([80, 40, 80]);
        }
      },
      error: (err) => {
        console.error('Error al registrar verificación', err);
        this.guardandoInspeccion.set(false);
        alert(err.error?.message || 'Error al guardar la inspección de campo');
      },
    });
  }

  // --- CÁMARA MÓVIL Y ESCÁNER EN VIVO ---

  abrirEscanerCamara(): void {
    this.mostrarEscaner.set(true);
    this.errorCamara.set(null);
    this.manualCodeInput = '';

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setTimeout(() => {
        this.iniciarStreamCamara();
      }, 100);
    } else {
      this.errorCamara.set(
        'El navegador no permite video en tiempo real en entornos no seguros (HTTP). Por favor usa la opción "Tomar Foto del QR con Cámara Móvil" para escanear.'
      );
      setTimeout(() => {
        this.cameraFileInputRef?.nativeElement?.click();
      }, 200);
    }
  }

  cerrarEscanerCamara(): void {
    this.detenerCamaraStream();
    this.mostrarEscaner.set(false);
  }

  async iniciarStreamCamara(): Promise<void> {
    this.errorCamara.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      this.errorCamara.set(
        'El navegador no permite video continuo en contextos no seguros (HTTP). Por favor usa el botón "Tomar Foto del QR con Cámara Móvil" para escanear.'
      );
      return;
    }

    try {
      this.detenerCamaraStream();

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: this.facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (firstErr) {
        console.warn('Fallo con constraints ideales, intentando cámara predeterminada:', firstErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: this.facingMode },
          });
        } catch (secondErr) {
          console.warn('Fallo con facingMode, intentando video simple:', secondErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      this.mediaStream = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : null;
      this.soportaLinterna = !!(capabilities && capabilities.torch);

      // Reintentar vincular el elemento <video> hasta 15 ticks (1.5 segundos) mientras Angular lo monta
      let retries = 0;
      const bindVideoFeed = async () => {
        const video = this.videoRef?.nativeElement;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          try {
            await video.play();
          } catch (playErr) {
            console.warn('Advertencia al reproducir video:', playErr);
          }

          this.scanningActive = true;
          this.errorCamara.set(null);
          this.loopEscaner();
        } else if (retries < 15) {
          retries++;
          setTimeout(bindVideoFeed, 100);
        } else {
          this.errorCamara.set('Elemento de visor de cámara no encontrado. Puede tomar una foto con su cámara.');
        }
      };

      await bindVideoFeed();
    } catch (err: any) {
      console.warn('Error al acceder a la cámara:', err);
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Permiso de cámara denegado en el navegador. Concede permisos o usa el botón de Tomar Foto abajo.'
        : 'Cámara en vivo no disponible (' + (err.message || err.name || 'Dispositivo no encontrado') + '). Puedes usar Tomar Foto.';
      this.errorCamara.set(msg);
    }
  }

  onFotoCapturada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const tryDecode = (targetMaxDim: number) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;

          let width = img.width;
          let height = img.height;
          if (width > targetMaxDim || height > targetMaxDim) {
            if (width > height) {
              height = Math.round((height * targetMaxDim) / width);
              width = targetMaxDim;
            } else {
              width = Math.round((width * targetMaxDim) / height);
              height = targetMaxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          return jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
        };

        let code = tryDecode(1200);
        if (!code || !code.data) code = tryDecode(800);
        if (!code || !code.data) code = tryDecode(500);

        if (code && code.data) {
          this.procesarCodigoEscaneado(code.data);
        } else {
          alert('No se detectó un código QR legible en la foto. Asegúrese de enfocar bien el código de cerca e intente de nuevo.');
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  loopEscaner(): void {
    if (!this.scanningActive) return;

    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          this.procesarCodigoEscaneado(code.data);
          return;
        }
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.loopEscaner());
  }

  procesarCodigoEscaneado(raw: string): void {
    this.detenerCamaraStream();
    this.mostrarEscaner.set(false);

    // Haptic feedback de éxito
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    let code = raw.trim();

    // Si es una URL del sistema, extraer el parámetro de código
    if (code.includes('/verificar/activo/')) {
      const parts = code.split('/verificar/activo/');
      code = parts[parts.length - 1].split('?')[0].split('#')[0];
    } else if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const obj = JSON.parse(code);
        if (obj.codigoQr) code = obj.codigoQr;
      } catch {}
    }

    this.router.navigate(['/verificar/activo', code]);
    this.cargarDatosActivo(code);
  }

  procesarCodigoManual(): void {
    const code = this.manualCodeInput.trim();
    if (!code) return;
    this.procesarCodigoEscaneado(code);
  }

  alternarLinterna(): void {
    if (!this.mediaStream || !this.soportaLinterna) return;
    const track = this.mediaStream.getVideoTracks()[0];
    this.linternaActiva = !this.linternaActiva;
    (track as any).applyConstraints({
      advanced: [{ torch: this.linternaActiva }],
    }).catch(() => {});
  }

  alternarCamara(): void {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.iniciarStreamCamara();
  }

  detenerCamaraStream(): void {
    this.scanningActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.linternaActiva = false;
  }

  imprimirRotulo(): void {
    window.print();
  }
}
