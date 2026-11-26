import { Component, Inject, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface VisorPdfData {
  titulo: string;
  pdfUrl?: string;
  docCite?: string;
  subtitulo?: string;
  blob?: Blob;
}

@Component({
  selector: 'app-visor-pdf-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="pdf-modal-container" role="dialog" aria-modal="true" aria-labelledby="pdf-dialog-title">
      <header class="dialog-header">
        <div class="header-info">
          <div class="pdf-badge" aria-hidden="true">
            <span class="material-icons">picture_as_pdf</span>
          </div>
          <div>
            <h2 id="pdf-dialog-title" class="dialog-title">{{ data.titulo || 'Documento Oficial NSIAF' }}</h2>
            <span class="dialog-subtitle">
              {{ data.docCite ? 'CITE: ' + data.docCite : (data.subtitulo || 'Estado Plurinacional de Bolivia') }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="icon-btn"
            (click)="imprimir()"
            aria-label="Imprimir documento oficial"
            matTooltip="Imprimir"
            [disabled]="loading() || !!errorMessage()"
          >
            <span class="material-icons">print</span>
          </button>
          <button
            type="button"
            class="icon-btn"
            mat-dialog-close
            aria-label="Cerrar visor de documento"
            matTooltip="Cerrar"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" class="header-progress" aria-label="Cargando documento PDF"></mat-progress-bar>
      }

      <div class="dialog-body">
        @if (loading()) {
          <div class="pdf-loading-state" role="status">
            <span class="material-icons spinner-icon">hourglass_top</span>
            <h3>Compilando Documento Oficial...</h3>
            <p>Generando membrete institucional, metadatos y código de verificación mediante pdf-lib.</p>
          </div>
        } @else if (errorMessage()) {
          <div class="pdf-error-state" role="alert">
            <span class="material-icons error-icon">report_problem</span>
            <h3>No se pudo previsualizar el documento</h3>
            <p>{{ errorMessage() }}</p>
            <button type="button" class="retry-btn" (click)="ngOnInit()">
              <span class="material-icons">refresh</span>
              <span>Reintentar</span>
            </button>
          </div>
        } @else if (safePdfUrl) {
          <iframe
            [src]="safePdfUrl"
            class="pdf-iframe"
            title="Vista previa del documento oficial PDF"
          ></iframe>
        }
      </div>

      <footer class="dialog-footer">
        <button type="button" class="cancel-btn" mat-dialog-close>
          Cerrar
        </button>
        @if (downloadUrl()) {
          <a
            class="download-btn"
            [href]="downloadUrl()"
            [download]="getDownloadFileName()"
            aria-label="Descargar archivo PDF"
          >
            <span class="material-icons">download</span>
            <span>Descargar PDF</span>
          </a>
        }
      </footer>
    </div>
  `,
  styles: [`
    .pdf-modal-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #0a192f;
      color: #ffffff;
      border-bottom: 1px solid #1e293b;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .pdf-badge {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
    }

    .dialog-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
      line-height: 1.3;
    }

    .dialog-subtitle {
      font-size: 0.82rem;
      color: #ffffff;
      font-weight: 600;
      display: block;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }

    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .header-progress {
      height: 3px;
    }

    .dialog-body {
      padding: 0;
      height: 75vh;
      min-width: 68vw;
      background: #1e293b;
      display: flex;
      position: relative;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }

    .pdf-loading-state, .pdf-error-state {
      margin: auto;
      text-align: center;
      padding: 2.5rem 1.5rem;
      color: #cbd5e1;
    }

    .pdf-loading-state h3, .pdf-error-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: #ffffff;
      font-size: 1.25rem;
    }

    .pdf-loading-state p, .pdf-error-state p {
      margin: 0 0 1.5rem 0;
      font-size: 0.9rem;
      color: #94a3b8;
      max-width: 440px;
    }

    .spinner-icon {
      font-size: 48px;
      color: #38bdf8;
      animation: spin 1.5s infinite ease-in-out;
    }

    .error-icon {
      font-size: 48px;
      color: #f87171;
    }

    .retry-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .dialog-footer {
      padding: 1rem 1.5rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
    }

    .cancel-btn {
      background: #ffffff;
      color: #0f172a;
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      padding: 0.55rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }

    .cancel-btn:hover {
      background: #f1f5f9;
    }

    .download-btn {
      background-color: #0d3269 !important;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      padding: 0.55rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      opacity: 1 !important;
      transition: background 0.2s;
    }

    .download-btn span {
      color: #ffffff !important;
      opacity: 1 !important;
    }

    .download-btn:hover {
      background-color: #092247 !important;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .dialog-body {
        min-width: 92vw;
        height: 65vh;
      }
    }
  `],
})
export class VisorPdfDialogComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly downloadUrl = signal('');

  safePdfUrl: SafeResourceUrl | null = null;
  private localBlobUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<VisorPdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VisorPdfData,
  ) {}

  ngOnInit(): void {
    if (this.data.blob) {
      this.cargarBlob(this.data.blob);
    } else if (this.data.pdfUrl) {
      if (this.data.pdfUrl.startsWith('blob:') || this.data.pdfUrl.startsWith('data:')) {
        this.downloadUrl.set(this.data.pdfUrl);
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
      } else {
        this.descargarYPrevisualizar(this.data.pdfUrl);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.localBlobUrl) {
      try {
        URL.revokeObjectURL(this.localBlobUrl);
      } catch {}
    }
  }

  private cargarBlob(blob: Blob): void {
    if (this.localBlobUrl) {
      try { URL.revokeObjectURL(this.localBlobUrl); } catch {}
    }
    this.localBlobUrl = URL.createObjectURL(blob);
    this.downloadUrl.set(this.localBlobUrl);
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.localBlobUrl);
    this.cdr.markForCheck();
  }

  private descargarYPrevisualizar(url: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        this.loading.set(false);
        this.cargarBlob(blob);
      })
      .catch((err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'No se pudo cargar el documento PDF');
        this.cdr.markForCheck();
      });
  }

  imprimir(): void {
    window.print();
  }

  getDownloadFileName(): string {
    const name = this.data.docCite || this.data.titulo || 'documento-nsiaf';
    return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  }
}
