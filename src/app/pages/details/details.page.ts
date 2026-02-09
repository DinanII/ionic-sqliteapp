import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonCard, IonToolbar, IonButtons, IonBackButton, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from 'src/app/services/database-service';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  standalone: true,
  imports: [IonCardContent, IonBackButton,
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCardTitle,
    IonCard,
    IonButtons, IonCardHeader],
})
export class DetailsPage implements OnInit {
  protected product: any = null;
  private route: ActivatedRoute = inject(ActivatedRoute);
  private databaseService: DatabaseService = inject(DatabaseService);

  constructor() {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(id))
      this.product = await this.databaseService.getProductById(id);
  }
}
