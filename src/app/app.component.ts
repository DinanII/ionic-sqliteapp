import {Component, inject, OnInit} from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { LoadingController, Platform } from '@ionic/angular';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { DatabaseService } from './services/database-service';
import {filter, take} from 'rxjs';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  private databaseService = inject(DatabaseService);
  private platform = inject(Platform);
  private loadingCtrl = inject(LoadingController);

  constructor() {
    console.log('AppComponent constructor called');
    this.initializeApp();
  }

  ngOnInit() {
    console.log('ngOnInit');
  }
  async initializeApp() {
    console.log('Starting app initialization...');

    await this.platform.ready();
    console.log('Platform ready');

    // const loading = await this.loadingCtrl.create();
    // await loading.present();
    // console.log('Loading spinner shown');

    try {
      console.log('About to call databaseService.init()...');
      await this.databaseService.init();
      console.log('Database init completed');

      // Wait for dbReady$ to emit true
      await new Promise<void>((resolve) => {
        this.databaseService.dbReady$
          .pipe(
            filter(ready => ready), // Only continue when true
            take(1)
          )
          .subscribe(() => {
            console.log('Database ready confirmed');
            resolve();
          });
      });

      console.log('Dismissing loading...');
      //await loading.dismiss();
      await StatusBar.setStyle({ style: Style.Default });
      await SplashScreen.hide();
      console.log('App initialization complete');

    } catch (error) {
      console.error('App initialization failed:', error);
      // await loading.dismiss();
    }
  }
}
