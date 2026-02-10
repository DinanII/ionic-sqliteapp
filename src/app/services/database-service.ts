import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, from, Observable, of, switchMap } from 'rxjs';
import { AlertController } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  // private readonly DB_SETUP_KEY = 'first_db_setup';
  private readonly DB_NAME_KEY = 'db_name';
  private readonly DB_NAME = 'products-db';

  private dbName: string | null = this.DB_NAME

  private dbReadySubject = new BehaviorSubject<boolean>(false);
  public readonly dbReady$ = this.dbReadySubject.asObservable();

  private http = inject(HttpClient);
  private alertCtrl = inject(AlertController);

  // #region Start

  constructor() {
    console.log('DatabaseService constructor called!');
  }


  private get database(): string {
    if (!this.dbName) {
      throw new Error('Database not initialized (dbName is empty)');
    }
    return this.dbName;
  }


  async init(): Promise<void> {
    console.log('Initializing database...');
    console.log('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    console.log('Capacitor.getPlatform():', Capacitor.getPlatform());
    if (!Capacitor.isNativePlatform()) {
      console.error('SQLite only available on native platforms. DB init aborted');
      return;
    }

    try {
      console.log('Setting up database pt 2, checked platform.');
      await this.setupDatabase();
    } catch (err) {
      console.error(`Database could not be initialized: ${err}`);

      const alert = await this.alertCtrl.create({
        header: 'Database error',
        message: 'This app cannot run without database access.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }
  // #endregion


  // #region Setup

  private async setupDatabase(): Promise<void> {
    console.log("Checking database...")

    //let setupDone,
    let storedName
    let setup = false
    try {
      // setupDone = await SecureStoragePlugin.get({
      //   key: this.DB_SETUP_KEY,
      // });
      storedName = await SecureStoragePlugin.get({
        key: this.DB_NAME_KEY,
      });
      setup = true
    }
    catch (error) {
      console.log(`DB does not seem to exist ${error}`)
    }

    console.log(`setupDone: (does not exist anymore, so undefined), storedName: ${storedName}`);
    if (!setup) {
      await this.downloadAndCreateDatabase();
    }
    else {
      await this.openDatabase();
    }
  }

  private async openDatabase(): Promise<void> {
    console.log("Opening database...");
    await CapacitorSQLite.createConnection({
      database: this.database,
    });
    await CapacitorSQLite.open({
      database: this.database,
    });
    console.log(`Database connected successfully (so it seems). ${this.database}`);
    this.dbReadySubject.next(true);
  }

  async closeDatabase(): Promise<void> {
    if (!this.dbName) return;

    await CapacitorSQLite.close({
      database: this.database,
    });

    this.dbReadySubject.next(false);
  }

  // #endregion

  // #region Initial Setup

private async downloadAndCreateDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.http
      .get('assets/mockupdata.json', { observe: 'response' })
      .subscribe({
        next: async (response: HttpResponse<any>) => {
          try {
            const jsonstring = JSON.stringify(response.body);
            console.log(`Downloaded JSON Database ${jsonstring}`);
            const valid = await CapacitorSQLite.isJsonValid({ jsonstring });
            if (!valid.result) {
              console.error(`Retrieved JSON data for DB import is invalid: ${JSON.stringify(jsonstring)}`);
              reject(new Error('Invalid database JSON'));
              return;
            }

            // Use consistent DB name
            this.dbName = this.DB_NAME;

            // Create connection
            await CapacitorSQLite.createConnection({
              database: this.database,
            });

            // Import JSON (with database parameter!)
            await CapacitorSQLite.importFromJson({
              jsonstring,
            });

            // Save to secure storage
            await SecureStoragePlugin.set({
              key: this.DB_NAME_KEY,
              value: this.dbName,
            });

            // await SecureStoragePlugin.set({
            //   key: this.DB_SETUP_KEY,
            //   value: '1',
            // });

            // Open database
            await CapacitorSQLite.open({
              database: this.database
            });

            // Create sync table (with database parameter)
            await CapacitorSQLite.createSyncTable({
              database: this.database
            });


            this.dbReadySubject.next(true);
            resolve();
          } catch (err) {
            console.error('Error during database creation:', err);
            reject(err);
          }
        },
        error: (error: Error) => {
          console.error('Failed to fetch JSON import file', error);
          reject(error); // ← Now properly rejects!
        },
      });
  });
}

  // #endregion

  // #region Queries

  getProductList(): Observable<any> {
    return this.dbReady$.pipe(
      switchMap((ready) => {
        if (!ready) {
          return of({ values: [] });
        }

        return from(
          CapacitorSQLite.query({
            database: this.database,
            statement: 'SELECT * FROM products;',
            values: [],
          }),
        );
      }),
    );
  }

  async getProductById(id: number): Promise<any> {
    const statement = `
      SELECT *
      FROM products
      LEFT JOIN vendors ON vendors.id = products.vendorid
      WHERE products.id = ?;
    `;

    const result = await CapacitorSQLite.query({
      database: this.database,
      statement,
      values: [id],
    });

    return result.values?.[0];
  }

  async addDummyProduct(name: string): Promise<void> {
    const statement = `
      INSERT INTO products (name, currency, value, vendorid)
      VALUES (?, 'EUR', ?, ?);
    `;

    await CapacitorSQLite.run({
      database: this.database,
      statement,
      values: [
        name,
        Math.floor(Math.random() * 100) + 1,
        Math.floor(Math.random() * 3) + 1,
      ],
    });
  }

  async deleteProduct(productId: number): Promise<void> {
    await CapacitorSQLite.run({
      database: this.database,
      statement: 'DELETE FROM products WHERE id = ?;',
      values: [productId],
    });
  }

  //#endregion

  // #region Export/Debug


  async getDatabaseExport(mode: 'full' | 'partial' = 'full') {
    return CapacitorSQLite.exportToJson({
      database: this.database,
      jsonexportmode: mode,
    });
  }

  async deleteDatabase(): Promise<void> {
    if (!this.dbName) return;

    await this.closeDatabase();

    await CapacitorSQLite.deleteDatabase({
      database: this.database,
    });

    this.dbName = null;

    await SecureStoragePlugin.set({ key: this.DB_NAME_KEY, value: '' });
    // await SecureStoragePlugin.set({ key: this.DB_SETUP_KEY, value: '' });
  }

  // #endregion
}
