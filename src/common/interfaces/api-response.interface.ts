export interface ApiPagination {
    page : number,
    limit : number,
    total : number,
    totalPages : number
}
export interface ApiListResponse<T>{
    data : T[],
    pagination : ApiPagination
}