import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import type { UsersRepository } from './repositories/users.repository.js';

describe('UsersService', () => {
  let repo: Record<keyof UsersRepository, ReturnType<typeof vi.fn>>;
  let service: UsersService;

  const dto = {
    documentType: 'DNI' as const,
    documentNumber: '12345678',
    firstName: 'Saul',
    lastName: 'Perez',
    email: 'saul@ventas.pe',
    roleIds: [1, 2],
  };

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      findByEmailWithCredentials: vi.fn(),
      findConflict: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
      update: vi.fn(),
    };
    service = new UsersService(repo as unknown as UsersRepository);
  });

  it('crea el usuario con contraseña hasheada y estado RESTORE', async () => {
    await service.create(dto);

    const data = repo.create.mock.calls[0][0];
    expect(data).toMatchObject({ status: 'RESTORE', roleIds: [1, 2] });
    expect(await bcrypt.compare(dto.documentNumber, data.passwordHash)).toBe(true);
  });

  it('rechaza un email ya registrado', async () => {
    repo.findConflict.mockResolvedValue({ email: dto.email, documentNumber: 'x' });
    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException('El correo electrónico ya está registrado'),
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('lanza 404 si el usuario no existe', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('al actualizar valida unicidad excluyendo al propio usuario y no envía roleIds', async () => {
    repo.findById.mockResolvedValue({ id: 3, ...dto });
    await service.update(3, { email: 'nuevo@ventas.pe', roleIds: [1] });

    expect(repo.findConflict).toHaveBeenCalledWith(
      'nuevo@ventas.pe',
      dto.documentNumber,
      3,
    );
    expect(repo.update).toHaveBeenCalledWith(3, { email: 'nuevo@ventas.pe' });
  });
});
