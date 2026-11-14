import { Module } from '@nestjs/common';
import { CompanyController } from './profile.controller';
import { CompanyService } from './profile.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
