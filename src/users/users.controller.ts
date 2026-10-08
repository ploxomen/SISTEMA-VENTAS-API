import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { RequireModule } from '../auth/decorators/require-module.decorator.js';
import { AppModules } from '../auth/app-modules.js';

@Controller('users')
@RequireModule(AppModules.USERS)
export class UsersController {
    constructor(private readonly usersService : UsersService ){}
    @Post()
    create(@Body() createUserDto : CreateUserDto){
        return this.usersService.create(createUserDto);
    }
}
