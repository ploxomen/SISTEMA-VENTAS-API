import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service.js';
import { ModulesController } from './modules.controller.js';

@Module({
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
