import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../services/database-service';
import { JsonSQLite } from '@capacitor-community/sqlite';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonList, IonItemSliding, IonLabel, IonItemOption, IonItemOptions, IonCard, IonCardContent } from "@ionic/angular/standalone";
import { JsonPipe } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { filter, take } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [RouterLink, FormsModule ,AsyncPipe, CurrencyPipe, JsonPipe,IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonList, IonItemSliding, IonLabel, IonItemOption, IonItemOptions, IonCard, IonCardContent, IonToolbar],
})
export class HomePage {
  products: any[] = [];
  export: JsonSQLite | undefined = undefined
  newProduct = 'My cool product';

private databaseService: DatabaseService = inject(DatabaseService)

constructor() {
  this.databaseService.dbReady$
    .pipe(
      filter(ready => ready),
      take(1)
    )
    .subscribe(() => {
      this.loadProducts();
    });
}


  loadProducts() {
    this.databaseService.getProductList().subscribe(res => {
      this.products = res.values ?? [];
    });
  }

  // Mode is either "partial" or "full"
  // Maybe use enum for this?
  async createExport(mode: string) {
    const dataExport = await this.databaseService.getDatabaseExport('full');
    this.export = dataExport.export;
  }

  async addProduct() {
    await this.databaseService.addDummyProduct(this.newProduct);
    this.newProduct = '';
    this.loadProducts();
  }

  async deleteProduct(product: any) {
    await this.databaseService.deleteProduct(product.id);
    this.products = this.products.filter(p => p != product);
  }

  // For testing..
  deleteDatabase() {
    this.databaseService.deleteDatabase();
  }
}
