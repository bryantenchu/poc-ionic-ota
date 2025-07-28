import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';
import JSZip from 'jszip';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, RouterModule]
})
export class LoginPage implements OnInit {

  constructor(private router: Router) { 
    this.performGetRequest();
  }

  async performGetRequest() {
    const options = {
      url: 'http://192.168.137.29:8080/version',
    };

    try {
      const response = await CapacitorHttp.get(options);
      console.log(response.data);
    } catch (error) {
      console.error('Error en la petición /version:', error);
    }
  }


  async callUpdaterService() {
    const options: HttpOptions = {
      url: 'http://192.168.137.29:8080/updater',
      responseType: 'blob' // Esto devuelve un string en base64 en CapacitorHttp
    };

    try {
      const response = await CapacitorHttp.get(options);

      // --- CORRECCIÓN 1: Cargar ZIP desde base64 ---
      const zip = new JSZip();
      // Le indicamos a JSZip que `response.data` es un string en base64
      const unzipped = await zip.loadAsync(response.data, { base64: true });

      console.log('ZIP descomprimido en memoria. Escribiendo archivos...');

      for (const filename in unzipped.files) {
        // hasOwnProperty es una buena práctica para iterar objetos
        if (Object.prototype.hasOwnProperty.call(unzipped.files, filename)) {
          const file = unzipped.files[filename];
          // Nos aseguramos de no procesar directorios
          if (!file.dir) {
            const content = await file.async('base64');

            // --- ADVERTENCIA SOBRE EL PROBLEMA 2 ---
            // El siguiente código escribirá los archivos correctamente en el directorio de datos de la app.
            // SIN EMBARGO, la aplicación NO usará estos archivos, ya que su código fuente
            // se carga desde un paquete de solo lectura. Este enfoque de actualización no funcionará.
            // Para una actualización real, necesitarías un servicio como Ionic Appflow.
            
            const webviewPath = await Filesystem.getUri({
              directory: Directory.Data,
              path: 'www/index.html'
            });
            console.log('dataUri',webviewPath)
            const dataUri = await Filesystem.readdir({directory:Directory.Data, path: ''})
             console.log('dataUri',dataUri)
            console.log('dataUri files',dataUri.files)
            await Filesystem.writeFile({
              path: webviewPath.uri, // Escribir en una subcarpeta para mantener el orden
              data: content,
              directory: Directory.Data, // Este es el directorio de almacenamiento, no el de la app
              recursive: true // Crea directorios padres si no existen
            });
            console.log(`Archivo escrito en Directory.Data: ${filename}`);
          }
        }
      }
      
      console.log('Proceso de escritura finalizado.');
      // Recargar la app no aplicará los cambios porque los archivos están en el lugar equivocado.
      // window.location.reload();

    } catch (error) {
      console.error('Error en la petición /updater:', error);
    }
  }

  ngOnInit() {
  }

  goToProducts() {
    this.router.navigate(['/products']);
  }
}