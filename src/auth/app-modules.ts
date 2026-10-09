/**
 * Valores de la columna `module.url` que protege cada controlador.
 * Son las rutas del frontend (el menú enlaza a `module.url`), por lo que
 * deben coincidir exactamente con los registros de la tabla `module`.
 */
export const AppModules = {
  USERS: '/dashboard/user',
  ROLES: '/dashboard/role',
  CATEGORIES: '/dashboard/categorie',
  BRANDS: '/dashboard/brand',
} as const;
