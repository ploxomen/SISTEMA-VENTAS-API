import { PartialType } from '@nestjs/mapped-types';
import { CreateModuleDto } from './create-module.dto.js';

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
