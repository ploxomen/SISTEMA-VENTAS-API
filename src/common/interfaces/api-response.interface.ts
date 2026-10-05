export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface ApiListResponse<T> {
  data: T[];
  pagination: ApiPagination;
}
export interface ApiResourcesResponse<T> {
  data: T;
  success?: boolean;
  message: string;
  error?: boolean;
}
