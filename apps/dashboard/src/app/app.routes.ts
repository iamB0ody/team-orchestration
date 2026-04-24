import type { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./workspaces.component").then((m) => m.WorkspacesComponent),
    title: "tot · workspaces",
  },
  {
    path: "workspace",
    loadComponent: () =>
      import("./missions.component").then((m) => m.MissionsComponent),
    title: "tot · missions",
  },
  { path: "**", redirectTo: "" },
];
