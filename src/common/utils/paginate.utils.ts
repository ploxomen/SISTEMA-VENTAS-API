import { PaginationDto } from '../dto/pagination.dto.js';
import { ApiListResponse } from '../interfaces/api-response.interface.js';

export interface PrismaPaginatedModel<T, FindManyArg> {
  findMany(args?: FindManyArg): Promise<T[]>;
  count(args?: { where?: any }): Promise<number>;
}
export async function paginate<
  T,
  FindManyArgs extends { where?: any; skip?: number; take?: number },
>(
  model: PrismaPaginatedModel<T, FindManyArgs>,
  paginationDto: PaginationDto,
  queryArgs: Omit<FindManyArgs, 'skip' | 'take'> = {} as any,
): Promise<ApiListResponse<T>> {
  const { page = 1, limit = 10 } = paginationDto;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    model.findMany({
      ...queryArgs,
      skip,
      take: limit,
    } as unknown as FindManyArgs),
    model.count({
      where: queryArgs.where,
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
