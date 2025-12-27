import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FarmService } from './farm.service';
import {
  CreateSeedlingStageDto,
  UpdateSeedlingStageDto,
  QuerySeedlingStageDto,
  CreateSeedlingBatchDto,
  UpdateSeedlingBatchDto,
  UpdateSeedlingBatchStatusDto,
  QuerySeedlingBatchDto,
} from 'src/dto/farm.dto';

@Controller('api/farm')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  // ==================== SeedlingStages Endpoints ====================

  @Post('seedling-stage/create')
  createSeedlingStage(@Body() data: CreateSeedlingStageDto) {
    return this.farmService.createSeedlingStage(data);
  }

  @Get('seedling-stage/fetch-all')
  findAllSeedlingStages(@Query() query: QuerySeedlingStageDto) {
    return this.farmService.findAllSeedlingStages(query);
  }

  @Get('seedling-stage/fetch/:id')
  findOneSeedlingStage(@Param('id') id: string) {
    return this.farmService.findOneSeedlingStage(id);
  }

  @Patch('seedling-stage/modify/:id')
  updateSeedlingStage(
    @Param('id') id: string,
    @Body() data: UpdateSeedlingStageDto,
  ) {
    return this.farmService.updateSeedlingStage(id, data);
  }

  @Delete('seedling-stage/delete/:id')
  removeSeedlingStage(@Param('id') id: string) {
    return this.farmService.removeSeedlingStage(id);
  }

  // ==================== SeedlingBatch Endpoints ====================

  @Post('seedling-batch/create')
  createSeedlingBatch(@Body() data: CreateSeedlingBatchDto) {
    return this.farmService.createSeedlingBatch(data);
  }

  @Get('seedling-batch/fetch-all')
  findAllSeedlingBatches(@Query() query: QuerySeedlingBatchDto) {
    return this.farmService.findAllSeedlingBatches(query);
  }

  @Get('seedling-batch/fetch/:id')
  findOneSeedlingBatch(@Param('id') id: string) {
    return this.farmService.findOneSeedlingBatch(id);
  }

  @Patch('seedling-batch/modify/:id')
  updateSeedlingBatch(
    @Param('id') id: string,
    @Body() data: UpdateSeedlingBatchDto,
  ) {
    return this.farmService.updateSeedlingBatch(id, data);
  }

  @Patch('seedling-batch/update-status/:id')
  updateSeedlingBatchStatus(
    @Param('id') id: string,
    @Body() data: UpdateSeedlingBatchStatusDto,
  ) {
    return this.farmService.updateSeedlingBatchStatus(id, data);
  }

  @Delete('seedling-batch/delete/:id')
  removeSeedlingBatch(@Param('id') id: string) {
    return this.farmService.removeSeedlingBatch(id);
  }
}
