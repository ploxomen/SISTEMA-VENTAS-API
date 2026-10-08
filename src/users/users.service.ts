import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { StatusUser } from '../generated/prisma/enums.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from './repositories/users.repository.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}
  async passwordHash(pass: string) {
    return await bcrypt.hash(pass, 10);
  }
  async create(createUserDto: CreateUserDto) {
    await this.verifiUniqueNumberDocEmail(
      createUserDto.email,
      createUserDto.documentNumber,
    );
    const { roleIds, ...formData } = createUserDto;
    return this.usersRepository.create({
      ...formData,
      passwordHash: await this.passwordHash(createUserDto.documentNumber),
      status: StatusUser.RESTORE,
      roleIds,
    });
  }
  async findAll() {
    return this.usersRepository.findAll();
  }
  async verifiUniqueNumberDocEmail(
    email: string,
    documentNumber: string,
    excludeUserId?: number,
  ) {
    const existUser = await this.usersRepository.findConflict(
      email,
      documentNumber,
      excludeUserId,
    );
    if (existUser && existUser.email === email) {
      throw new ConflictException('El correo electrónico ya está registrado');
    } else if (existUser && existUser.documentNumber === documentNumber) {
      throw new ConflictException('El número de documento ya está registrado');
    }
  }
  async findOne(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
  async update(id: number, updateUserDto: UpdateUserDto) {
    const current = await this.findOne(id);
    const { roleIds: _roleIds, ...data } = updateUserDto;
    if (data.email || data.documentNumber) {
      await this.verifiUniqueNumberDocEmail(
        data.email ?? current.email,
        data.documentNumber ?? current.documentNumber,
        id,
      );
    }
    return this.usersRepository.update(id, data);
  }
}
