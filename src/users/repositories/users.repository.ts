import type { DocumentType, StatusUser } from '../../generated/prisma/enums.js';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

/** Representación pública del usuario: nunca incluye la contraseña. */
export interface UserEntity {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string | null;
  phone: string | null;
  status: StatusUser;
  createdAt: Date;
}

/** Proyección exclusiva para autenticación. */
export interface UserCredentials {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status: StatusUser;
}

export interface CreateUserData {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  phone?: string;
  passwordHash: string;
  status: StatusUser;
  roleIds: number[];
}

export type UpdateUserData = Partial<
  Omit<CreateUserData, 'passwordHash' | 'roleIds'>
>;

export interface UsersRepository {
  findById(id: number): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  findByEmailWithCredentials(email: string): Promise<UserCredentials | null>;
  findConflict(
    email: string,
    documentNumber: string,
    excludeId?: number,
  ): Promise<Pick<UserEntity, 'email' | 'documentNumber'> | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: number, data: UpdateUserData): Promise<UserEntity>;
}
