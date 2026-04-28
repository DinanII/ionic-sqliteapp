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


  /**
   * What the key is named where the database name is stored under in the SecureStorage Plugin
   * @private
   */
  private readonly DB_NAME_KEY = 'db_name';


  /**
   * The name of the app's internal database
   * @private
   */
  private readonly DB_NAME = 'products-db';


  /**
   * dbReady Internal subject to set the DB as initialized
   * @private
   */
  private dbReadySubject = new BehaviorSubject<boolean>(false);

  /*

  */
  /**
   * dbReady: Public observable others (like components, services) where this service is injected in can read.
   * This observable is readonly to prevent accidental (outside) edits.
   */
  public readonly dbReady$ = this.dbReadySubject.asObservable();

  /**
   * Injection of Angular's HttpClient, used to fetch the mockup date from the assets.
   * @private
   */
  private http = inject(HttpClient);


  /**
   * Injection of the Ionic AlertController to notify the user in case when an unexpected event occurs.
   * @private
   */
  private alertCtrl = inject(AlertController);

  // #region Start

  constructor() {
    console.log('DatabaseService constructor called!');
  }

  /**
   * Returns {@link DB_NAME} when {@link dbReady$} is true, throws an {@link Error} otherwise.
   * @returns string
   * @private
   */
  private get database(): string {
    if (!this.dbReady$) {
      throw new Error('Database not initialized (dbName is empty)');
    }
    return this.DB_NAME;
  }

  /**
   * Performs checks if database can be set up (Capacitor.isNativePlatform() must be true) and creates an {@link HTMLIonAlertElement} and logs if an errors occur.
   * Attempts to call {@link setupDatabase()}.
   */
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

  /**
   * If {@link DB_NAME_KEY} exists in {@link SecureStoragePlugin}, the database will be opened via {@link openDatabase}.
   * When no value with the key exists, the database is created via {@link downloadAndCreateDatabase}.
   * @private
   */
  private async setupDatabase(): Promise<void> {
    console.log("Checking database...")

    let storedName
    let setup: boolean = false
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

    console.log(`setupDone: (does not exist anymore, so undefined), storedName:`,storedName);
    if (!setup) {
      await this.downloadAndCreateDatabase();
    }
    else {
      await this.openDatabase();
    }
  }


  /**
   * Creates a connection to and opens the internal database. Only if {@link dbReady$} is false, an error will be logged otherwise.
   * @private
   */
  private async openDatabase(): Promise<void> {
    if(!this.dbReady$) {
      console.log("Opening database...");
      await CapacitorSQLite.createConnection({
        database: this.database,
      });
      await CapacitorSQLite.open({
        database: this.database,
      });
      console.log(`Database connected successfully (so it seems). ${this.database}`);
      this.dbReadySubject.next(true);
      return
    }
    console.warn(`Database was already connected successfully.`);
  }

  /**
   * Closes the connection to the internal database.
   */
  async closeDatabase(): Promise<void> {
    if (this.dbReady$) {
      await CapacitorSQLite.close({
        database: this.database,
      });
      this.dbReadySubject.next(false);
      return
    }
    console.warn(`Database was already closed.`);
  }

  // #endregion

  // #region Initial Setup

  /**
   * Downloads the database model from the assets' directory, initializes a database connection, imports the model and creates a sync table.
   * The internal {@link DB_NAME} is also stored in the SecureStorage.
   * @private
   */
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


            // Create connection
            await CapacitorSQLite.createConnection({
              database: this.database,
            });

            // Import JSON
            await CapacitorSQLite.importFromJson({
              jsonstring,
            });

            // Save to secure storage
            await SecureStoragePlugin.set({
              key: this.DB_NAME_KEY,
              value: this.DB_NAME,
            });

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
          reject(error); // Now properly rejects!
        },
      });
  });
}

  // #endregion

  // #region Queries

  /**
   * Returns an empty array as observable if the database is not ready and a observable with the retrieved records
   * from the database if the database is initialized.
   */
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

  /**
   * Returns the product based on the given ID (number). Might crash if no product can be found.
   * @param id
   */
  async getProductById(id: number): Promise<any> {
    // TODO: Make this method more robust, so it handles accordingly if no data can be found.
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

  /**
   * Adds a Dummy product to the database with the given name (string). A random price will be generated. Currency is
   * (still) hardcoded to Euro.
   * @param name
   */
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

  /**
   * Removes a product based on the given productId (number).
   * @param productId
   */
  async deleteProduct(productId: number): Promise<void> {
    // TODO: Make method more robust if no product can be found.
    await CapacitorSQLite.run({
      database: this.database,
      statement: 'DELETE FROM products WHERE id = ?;',
      values: [productId],
    });
  }

  //#endregion

  // #region Export/Debug

  /**
   * Meant for development purposes, generates a JSON export from the database and returns it.
   * @param mode
   */
  async getDatabaseExport(mode: 'full' | 'partial' = 'full') {
    return CapacitorSQLite.exportToJson({
      database: this.database,
      jsonexportmode: mode,
    });
  }

  /**
   * Closes the database if is not ready and deletes it. The {@link DB_NAME} in SecureStorage is also cleared.
   */
  async deleteDatabase(): Promise<void> {
    if (!this.dbReady$) return;

    await this.closeDatabase();

    await CapacitorSQLite.deleteDatabase({
      database: this.database,
    });

    // this.DB_NAME = null;

    await SecureStoragePlugin.set({ key: this.DB_NAME_KEY, value: '' });
    // await SecureStoragePlugin.set({ key: this.DB_SETUP_KEY, value: '' });
  }

  // #endregion
}
