import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ScanbotSdkService } from "../service/scanbot-sdk-service";
import { NavigationUtils } from "../service/navigation-utils";
import { ImageUtils } from "../service/image-utils";
import { DocumentRepository } from "../service/document-repository";
import Swal from "sweetalert2";
import { RoutePaths } from "../model/RoutePaths";
import { Utils } from "../service/utils";

export enum FeatureId {
  DocumentPicker,
  BarcodePicker,
  License,
}
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit {
  router: Router;
  sdk: ScanbotSdkService;
  documents: DocumentRepository;

  features: any = [
    { route: RoutePaths.DocumentScanner, name: "Scan Documents" },
    { route: RoutePaths.BarcodeScanner, name: "Scan Barcodes" },
    { route: RoutePaths.MrzScanner, name: "Scan MRZ" },
    { id: FeatureId.DocumentPicker, name: "Pick Document image" },
    { id: FeatureId.BarcodePicker, name: "Pick Barcode image" },
    { route: RoutePaths.ImageResults, name: "Document Results" },
    { id: FeatureId.License, name: "Check License" },
  ];

  constructor(
    _router: Router,
    _sdk: ScanbotSdkService,
    _repository: DocumentRepository,
  ) {
    this.router = _router;
    this.sdk = _sdk;
    this.documents = _repository;
  }

  ngOnInit(): void {
    NavigationUtils.showBackButton(false);
  }

  async onItemClick(e) {
    if (e.route) {
      await this.router.navigateByUrl(e.route);
      return;
    }

    if (e.id === FeatureId.DocumentPicker) {
      const image = await ImageUtils.pick(ImageUtils.MIME_TYPE_JPEG);

      const contourDetectionResult = await this.sdk.detectDocument(image.original);
      if (contourDetectionResult.success === true && contourDetectionResult.polygon) {
        const cropped = await this.sdk.cropAndRotateImageCcw(image.original, contourDetectionResult.polygon, 0);
        const documentDetectionResult = { ...contourDetectionResult, original: image.original, cropped: cropped };

        const blurDetector = await this.sdk.createBlurDetector();
        console.log('estimateBlurrinessOnBuffer', await blurDetector.estimateBlurrinessOnBuffer(documentDetectionResult.original));
        await blurDetector.release();

        this.documents.add(documentDetectionResult);
        alert("Detection successful");
      } else {
        alert("Detection failed");
      }
    }

    if (e.id === FeatureId.BarcodePicker) {
      const result = await ImageUtils.pick(ImageUtils.MIME_TYPE_JPEG, true);

      const detection = await this.sdk?.detectBarcodes(
        result.data
      );
      if (detection !== undefined) {
        alert(Utils.formatBarcodes(detection.barcodes));
      }
    }

    if (e.id === FeatureId.License) {
      await Swal.fire({
        title: "License Info",
        text: await this.sdk.licenseInfoString(),
      });
    }
  }
}
