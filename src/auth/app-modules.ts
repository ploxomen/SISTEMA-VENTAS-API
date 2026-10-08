/**
 * Valores de la columna `module.url` que protege cada controlador.
 * Deben coincidir exactamente con los registros de la tabla `module`.
 */
export const AppModules = {
  USERS: '/usuarios',
  ROLES: '/roles',
  CATEGORIES: '/categorias',
  BRANDS: '/marcas',
} as const;
