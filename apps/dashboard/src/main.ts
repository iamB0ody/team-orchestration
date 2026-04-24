import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, withHashLocation } from "@angular/router";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { provideZonelessChangeDetection } from "@angular/core";

import { AppComponent } from "./app/app.component";
import { APP_ROUTES } from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // hash location for simple static dev (works outside Electron too)
    provideRouter(APP_ROUTES, withHashLocation()),
    provideHttpClient(withFetch()),
  ],
}).catch((err) => console.error(err));
